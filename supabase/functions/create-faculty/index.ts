import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function validateAdminToken(supabase: any, adminToken: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("admin_tokens")
    .select("id")
    .eq("token", adminToken)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  return !error && !!data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { adminToken, facultyCode, password, branchId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Validate admin token against database
    if (!adminToken || typeof adminToken !== "string" || !(await validateAdminToken(supabase, adminToken))) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate inputs
    if (!facultyCode || !password || !branchId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ success: false, error: "Password must be at least 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate synthetic email from faculty code
    const syntheticEmail = `${facultyCode.toLowerCase()}@faculty.studyease.local`;

    // Check if faculty code already exists
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("faculty_code", facultyCode.toUpperCase())
      .maybeSingle();

    if (existingProfile) {
      return new Response(
        JSON.stringify({ success: false, error: "Faculty ID already exists" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create auth user with admin API (auto-confirms)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: syntheticEmail,
      password: password,
      email_confirm: true,
      user_metadata: { name: facultyCode.toUpperCase() },
    });

    if (authError) {
      return new Response(
        JSON.stringify({ success: false, error: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authData.user.id;

    // Add faculty role
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: "faculty" });

    if (roleError) {
      console.error("Role insert error:", roleError);
    }

    // Look up the branch's college so the faculty profile is properly scoped
    const { data: branchRow } = await supabase
      .from("branches")
      .select("college_id")
      .eq("id", branchId)
      .maybeSingle();

    // Update profile with branch, college, and faculty code
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        faculty_code: facultyCode.toUpperCase(),
        branch_id: branchId,
        college_id: branchRow?.college_id ?? null,
        name: facultyCode.toUpperCase(),
      })
      .eq("id", userId);

    if (profileError) {
      console.error("Profile update error:", profileError);
    }

    return new Response(
      JSON.stringify({ success: true, userId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
