// supabase/functions/delete-account/index.ts
//
// Edge Function: delete-account
// Finalidade: exclusão REAL de conta (LGPD Art. 18 VI + Play Store policy).
// Estratégia: ver prompt acima. Sem Google Drive (feature desativada).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing env vars: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verificar JWT do usuário
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);

    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    console.log(`[delete-account] Starting deletion for user ${userId}`);

    // 1. Buscar membership
    const { data: membership, error: memberErr } = await supabaseAdmin
      .from("family_members")
      .select("family_id, role")
      .eq("user_id", userId)
      .maybeSingle();

    if (memberErr) {
      console.warn("[delete-account] Error fetching membership:", memberErr);
    }

    if (membership) {
      // 2. Contar membros da família
      const { count } = await supabaseAdmin
        .from("family_members")
        .select("*", { count: "exact", head: true })
        .eq("family_id", membership.family_id);

      const isOwner = membership.role === "owner";
      const isAlone = (count ?? 1) <= 1;

      if (isOwner || isAlone) {
        // 3a. Deletar família inteira (CASCADE em family_members, transactions, categories, recurring_rules)
        const { error: famDelErr } = await supabaseAdmin
          .from("families")
          .delete()
          .eq("id", membership.family_id);

        if (famDelErr) {
          console.error("[delete-account] Error deleting family:", famDelErr);
          throw famDelErr;
        }
        console.log(`[delete-account] Family ${membership.family_id} deleted`);
      } else {
        // 3b. MEMBER com outros: anonimizar transactions.created_by
        const { error: anonErr } = await supabaseAdmin
          .from("transactions")
          .update({ created_by: null })
          .eq("created_by", userId);

        if (anonErr) {
          console.warn("[delete-account] Error anonymizing transactions:", anonErr);
        }

        // 3c. Remover membership
        const { error: memberDelErr } = await supabaseAdmin
          .from("family_members")
          .delete()
          .eq("user_id", userId)
          .eq("family_id", membership.family_id);

        if (memberDelErr) {
          console.error("[delete-account] Error deleting membership:", memberDelErr);
          throw memberDelErr;
        }
        console.log(`[delete-account] Membership removed for user ${userId}`);
      }
    }

    // 4. Deletar profile
    const { error: profileDelErr } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileDelErr) {
      console.warn("[delete-account] Error deleting profile:", profileDelErr);
    }

    // 5. Deletar auth user (PONTO SEM RETORNO — invalida JWT)
    const { error: authDelErr } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authDelErr) {
      console.error("[delete-account] Error deleting auth user:", authDelErr);
      throw authDelErr;
    }
    console.log(`[delete-account] Auth user ${userId} deleted`);

    // 6. Cleanup best-effort de Storage (snapshots cifrados, sem risco se falhar)
    try {
      await supabaseAdmin.storage
        .from("ascen-snapshots")
        .remove([`${userId}/device-snapshot.enc`]);
    } catch (e) {
      console.warn("[delete-account] Could not delete personal snapshot:", e);
    }

    if (membership) {
      try {
        await supabaseAdmin.storage
          .from("ascen-snapshots")
          .remove([`family/${membership.family_id}/device-snapshot.enc`]);
      } catch (e) {
        console.warn("[delete-account] Could not delete family snapshot:", e);
      }
    }

    console.log(`[delete-account] Successfully deleted user ${userId}`);

    return new Response(
      JSON.stringify({ success: true, message: "Account deleted successfully" }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[delete-account] error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
});
