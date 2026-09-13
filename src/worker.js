import { keyAgentsTable, matchLineInput } from "./matcher.js";

function authorized(request, env) {
  const secret = String(env.LINE_AGENT_WORKER_SHARED_SECRET || "");
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

function json(value, status = 200) {
  return Response.json(value, { status, headers: { "cache-control": "no-store" } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/healthz") {
      return json({ status: "ok", table: keyAgentsTable.table_name, version: keyAgentsTable.schema_version });
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
    return json(matchLineInput(body.message));
  }
};
