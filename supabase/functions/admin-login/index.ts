import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userId: rawUserId, password: rawPassword, collegeId } = await req.json();
    const userId = (rawUserId || "").trim();
    const password = (rawPassword || "").trim();

    if (!collegeId || !userId || !password) {
      return new Response(
        JSON.stringify({ success: false, error: "College and credentials required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: adminRecord } = await supabase
      .from("branch_admins")
      .select("id, branch_id, is_super_admin, college_id")
      .eq("user_id_credential", userId)
      .eq("password_credential", password)
      .eq("college_id", collegeId)
      .maybeSingle();

    if (!adminRecord) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid admin credentials" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase
      .from("admin_tokens")
      .insert({
        token,
        branch_id: adminRecord.branch_id ?? null,
        college_id: collegeId,
        is_super_admin: !!adminRecord.is_super_admin,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error("Token insert error:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: "Server error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        token,
        collegeId,
        branchId: adminRecord.branch_id,
        isSuperAdmin: !!adminRecord.is_super_admin,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Admin login error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
