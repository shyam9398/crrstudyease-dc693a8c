import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function validateSuperAdmin(supabase: any, adminToken: string): Promise<boolean> {
  // Get the branch_id from the token
  const { data: tokenData, error: tokenError } = await supabase
    .from("admin_tokens")
    .select("branch_id")
    .eq("token", adminToken)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (tokenError || !tokenData) return false;

  // Check if this branch's admin is a super admin
  const { data: adminData } = await supabase
    .from("branch_admins")
    .select("is_super_admin")
    .eq("branch_id", tokenData.branch_id)
    .maybeSingle();

  return adminData?.is_super_admin === true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { adminToken, action } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (!adminToken || !(await validateSuperAdmin(supabase, adminToken))) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized: Super Admin access required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "list") {
      // List all branch admins with branch names
      const { data: admins, error } = await supabase
        .from("branch_admins")
        .select("id, branch_id, user_id_credential, is_super_admin, created_at");

      if (error) throw error;

      // Get branch names
      const { data: branches } = await supabase
        .from("branches")
        .select("id, name");

      const branchMap: Record<string, string> = {};
      (branches || []).forEach((b: any) => { branchMap[b.id] = b.name; });

      const enriched = (admins || []).map((a: any) => ({
        ...a,
        branch_name: branchMap[a.branch_id] || "Unknown",
      }));

      return new Response(
        JSON.stringify({ success: true, admins: enriched }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "create_branch_admin") {
      const { branchName, userIdCredential, passwordCredential } = body;

      if (!branchName || !userIdCredential || !passwordCredential) {
        return new Response(
          JSON.stringify({ success: false, error: "Branch name, user ID, and password are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if branch exists, create if not
      let branchId: string;
      const { data: existingBranch } = await supabase
        .from("branches")
        .select("id")
        .ilike("name", branchName)
        .maybeSingle();

      if (existingBranch) {
        branchId = existingBranch.id;
      } else {
        const { data: newBranch, error: branchError } = await supabase
          .from("branches")
          .insert({ name: branchName })
          .select("id")
          .single();

        if (branchError) {
          return new Response(
            JSON.stringify({ success: false, error: "Failed to create branch: " + branchError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        branchId = newBranch.id;
      }

      // Check if admin already exists for this branch
      const { data: existingAdmin } = await supabase
        .from("branch_admins")
        .select("id")
        .eq("branch_id", branchId)
        .maybeSingle();

      if (existingAdmin) {
        return new Response(
          JSON.stringify({ success: false, error: "An admin already exists for this branch" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if user_id_credential is unique
      const { data: existingCred } = await supabase
        .from("branch_admins")
        .select("id")
        .eq("user_id_credential", userIdCredential)
        .maybeSingle();

      if (existingCred) {
        return new Response(
          JSON.stringify({ success: false, error: "User ID already in use" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: insertError } = await supabase
        .from("branch_admins")
        .insert({
          branch_id: branchId,
          user_id_credential: userIdCredential,
          password_credential: passwordCredential,
          is_super_admin: false,
        });

      if (insertError) {
        return new Response(
          JSON.stringify({ success: false, error: insertError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, branchId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update_credentials") {
      const { branchAdminId, userIdCredential, passwordCredential } = body;

      if (!branchAdminId) {
        return new Response(
          JSON.stringify({ success: false, error: "Branch admin ID required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const updates: Record<string, string> = {};
      if (userIdCredential) updates.user_id_credential = userIdCredential;
      if (passwordCredential) updates.password_credential = passwordCredential;

      if (Object.keys(updates).length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: "Nothing to update" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("branch_admins")
        .update(updates)
        .eq("id", branchAdminId)
        .eq("is_super_admin", false); // Can't edit super admin

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete") {
      const { branchAdminId } = body;

      if (!branchAdminId) {
        return new Response(
          JSON.stringify({ success: false, error: "Branch admin ID required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Don't allow deleting super admin
      const { data: target } = await supabase
        .from("branch_admins")
        .select("is_super_admin")
        .eq("id", branchAdminId)
        .maybeSingle();

      if (target?.is_super_admin) {
        return new Response(
          JSON.stringify({ success: false, error: "Cannot delete Super Admin" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("branch_admins")
        .delete()
        .eq("id", branchAdminId);

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
