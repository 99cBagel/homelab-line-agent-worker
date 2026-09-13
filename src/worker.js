import { keyAgentsTable, matchLineInput } from "./matcher.js";
import { loadKat, loadRolePrompt, updateConfig, CONFIG_KEYS } from "./config.js";

function authorized(request, env) {
  const secret = String(env.LINE_AGENT_WORKER_SHARED_SECRET || "");
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

function administrator(request, env, actorId) {
  // Vercel admits only direct chats. The internal API still needs the shared
  // service secret and a LINE actor ID for the R2 audit metadata.
  return authorized(request, env) && Boolean(actorId);
}

function json(value, status = 200) {
  return Response.json(value, { status, headers: { "cache-control": "no-store" } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/healthz") {
      const kat = await loadKat(env);
      return json({ status: "ok", table: kat.value.table_name || keyAgentsTable.table_name, version: kat.value.schema_version, source: kat.source });
    }
    if (request.method === "GET" && /^\/config\/(kat|role-prompt)$/.test(url.pathname)) {
      if (!authorized(request, env)) return json({ error: "Unauthorized" }, 401);
      const kind = url.pathname.endsWith("kat") ? "kat" : "role_prompt";
      const config = kind === "kat" ? await loadKat(env) : await loadRolePrompt(env);
      return json({ kind, content: kind === "kat" ? JSON.stringify(config.value, null, 2) : config.value, source: config.source, version: config.version });
    }
    if (request.method === "POST" && /^\/config\/(kat|role-prompt)$/.test(url.pathname)) {
      let body;
      try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
      if (!administrator(request, env, body?.actor_id)) return json({ error: "Forbidden" }, 403);
      const kind = url.pathname.endsWith("kat") ? "kat" : "role_prompt";
      try { return json(await updateConfig(env, kind, body.content, body.actor_id)); }
      catch (error) { return json({ error: error.message }, 400); }
    }
    if (request.method !== "POST" || url.pathname !== "/match") return json({ error: "Not found" }, 404);
    if (!authorized(request, env)) return json({ error: "Unauthorized" }, 401);
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }
    if (typeof body?.message !== "string" || body.message.length > 2000) {
      return json({ error: "message must be a string up to 2000 characters" }, 400);
    }
    const kat = await loadKat(env);
    return json({ ...matchLineInput(body.message, kat.value), table_source: kat.source, table_version: kat.version });
  }
};
