import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomUUID().replace(/-/g, "");
  const data = new TextEncoder().encode(salt + ":" + password);
  const buf = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0")).join("");
  return `sha256$${salt}$${hex}`;
}

async function validateAdminToken(supabase: any, adminToken: string) {
  const { data } = await supabase
    .from("admin_tokens")
    .select("college_id")
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
        .from("students")
        .select("id, user_id, name, branch_id, regulation_id, year_sem, created_at")
        .eq("college_id", collegeId).order("created_at", { ascending: false });
      return new Response(JSON.stringify({ success: true, students: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create") {
      const userId = (body.userId || "").trim();
      const name = (body.name || "").trim();
      const password = (body.password || "").trim();
      const branchId = body.branchId || null;
      if (!userId || !name || !password || !branchId) {
        return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (password.length < 6) {
        return new Response(JSON.stringify({ success: false, error: "Password must be at least 6 characters" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: dup } = await supabase.from("students")
        .select("id").eq("user_id", userId).maybeSingle();
      if (dup) {
        return new Response(JSON.stringify({ success: false, error: "Student ID already exists" }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const password_hash = await hashPassword(password);
      const { error } = await supabase.from("students").insert({
        user_id: userId, name, password_hash,
        college_id: collegeId, branch_id: branchId,
      });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      const { studentId, name, password, branchId } = body;
      if (!studentId) return new Response(JSON.stringify({ success: false, error: "Missing studentId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (name?.trim()) patch.name = name.trim();
      if (branchId) patch.branch_id = branchId;
      if (password) {
        if (password.length < 6) return new Response(JSON.stringify({ success: false, error: "Password too short" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
        patch.password_hash = await hashPassword(password);
      }
      const { error } = await supabase.from("students").update(patch)
        .eq("id", studentId).eq("college_id", collegeId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { studentId } = body;
      if (!studentId) return new Response(JSON.stringify({ success: false, error: "Missing studentId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const { error } = await supabase.from("students")
        .delete().eq("id", studentId).eq("college_id", collegeId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("manage-students error:", e);
    return new Response(JSON.stringify({ success: false, error: (e as Error).message || "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
