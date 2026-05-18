import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function validateAdminToken(supabase: any, adminToken: string) {
  const { data } = await supabase
    .from("admin_tokens")
    .select("college_id, is_super_admin")
    .eq("token", adminToken)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return data || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const { adminToken, action } = body;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const session = await validateAdminToken(supabase, adminToken);
    if (!session?.college_id) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const collegeId = session.college_id;

    if (action === "list") {
      const { data } = await supabase
        .from("branches").select("id, name, created_at")
        .eq("college_id", collegeId).order("name");
      return new Response(JSON.stringify({ success: true, branches: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create") {
      const name = (body.name || "").trim();
      if (!name) return new Response(JSON.stringify({ success: false, error: "Branch name required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const { data: dup } = await supabase.from("branches")
        .select("id").eq("college_id", collegeId).ilike("name", name).maybeSingle();
      if (dup) return new Response(JSON.stringify({ success: false, error: "Branch already exists" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const { data, error } = await supabase.from("branches")
        .insert({ name, college_id: collegeId }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, branch: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      const { branchId, name } = body;
      if (!branchId || !name?.trim()) return new Response(JSON.stringify({ success: false, error: "Missing fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const { error } = await supabase.from("branches")
        .update({ name: name.trim() }).eq("id", branchId).eq("college_id", collegeId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { branchId } = body;
      if (!branchId) return new Response(JSON.stringify({ success: false, error: "Missing branchId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const { error } = await supabase.from("branches")
        .delete().eq("id", branchId).eq("college_id", collegeId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("manage-branches error:", e);
    return new Response(JSON.stringify({ success: false, error: (e as Error).message || "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
