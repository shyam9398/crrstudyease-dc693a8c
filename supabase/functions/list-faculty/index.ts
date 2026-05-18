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
    const { adminToken, branchId, collegeId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (!adminToken || !(await validateAdminToken(supabase, adminToken))) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!branchId && !collegeId) {
      return new Response(
        JSON.stringify({ success: false, error: "Branch or college ID required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let pq = supabase.from("profiles")
      .select("id, faculty_code, branch_id, college_id, name, created_at")
      .not("faculty_code", "is", null);
    if (branchId) pq = pq.eq("branch_id", branchId);
    if (collegeId) pq = pq.eq("college_id", collegeId);
    const { data: profiles, error: profilesError } = await pq;

    if (profilesError) {
      return new Response(
        JSON.stringify({ success: false, error: profilesError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sq = supabase.from("subjects").select("id", { count: "exact", head: true });
    if (branchId) sq = sq.eq("branch_id", branchId);
    if (collegeId) sq = sq.eq("college_id", collegeId);
    const { count } = await sq;

    return new Response(
      JSON.stringify({ success: true, faculty: profiles || [], subjectCount: count || 0 }),
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
