import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifyPassword(stored: string, password: string): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "sha256") return false;
  const salt = parts[1];
  const expected = parts[2];
  const data = new TextEncoder().encode(salt + ":" + password);
  const buf = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === expected;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { userId: rawUserId, password: rawPassword, collegeId } = await req.json();
    const userId = (rawUserId || "").trim();
    const password = (rawPassword || "").trim();

    if (!userId || !password || !collegeId) {
      return new Response(JSON.stringify({ success: false, error: "All fields required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: student } = await supabase
      .from("students")
      .select("id, user_id, name, password_hash, college_id, branch_id, regulation_id, year_sem")
      .eq("user_id", userId)
      .eq("college_id", collegeId)
      .maybeSingle();

    if (!student || !student.password_hash) {
      return new Response(JSON.stringify({ success: false, error: "Invalid credentials" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ok = await verifyPassword(student.password_hash, password);
    if (!ok) {
      return new Response(JSON.stringify({ success: false, error: "Invalid credentials" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { password_hash: _ph, ...safe } = student;
    return new Response(JSON.stringify({ success: true, student: safe }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("student-login error:", e);
    return new Response(JSON.stringify({ success: false, error: "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
