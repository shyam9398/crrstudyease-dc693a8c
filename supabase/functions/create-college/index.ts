import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { name, logo_url, branchName, adminUserId, adminPassword } = await req.json();

    const cName = (name || "").trim();
    const bName = (branchName || "").trim();
    const aId = (adminUserId || "").trim();
    const aPw = (adminPassword || "").trim();

    if (!cName || !bName || !aId || !aPw) {
      return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aPw.length < 6) {
      return new Response(JSON.stringify({ success: false, error: "Password must be at least 6 characters" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Check duplicate college name
    const { data: existing } = await supabase
      .from("colleges").select("id").ilike("name", cName).maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ success: false, error: "A college with this name already exists" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: college, error: cErr } = await supabase
      .from("colleges").insert({ name: cName, logo_url: logo_url || null }).select().single();
    if (cErr) throw cErr;

    const { data: branch, error: bErr } = await supabase
      .from("branches").insert({ name: bName, college_id: college.id }).select().single();
    if (bErr) {
      await supabase.from("colleges").delete().eq("id", college.id);
      throw bErr;
    }

    const { error: aErr } = await supabase.from("branch_admins").insert({
      user_id_credential: aId,
      password_credential: aPw,
      branch_id: branch.id,
      college_id: college.id,
      is_super_admin: true,
    });
    if (aErr) {
      await supabase.from("branches").delete().eq("id", branch.id);
      await supabase.from("colleges").delete().eq("id", college.id);
      throw aErr;
    }

    return new Response(JSON.stringify({ success: true, collegeId: college.id, branchId: branch.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-college error:", e);
    return new Response(JSON.stringify({ success: false, error: (e as Error).message || "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
