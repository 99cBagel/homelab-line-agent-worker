import assert from "node:assert/strict";
import test from "node:test";
import { loadKat, updateConfig } from "../src/config.js";

function bucket() {
  const objects = new Map();
  return {
    objects,
    async get(key) {
      const value = objects.get(key);
      return value === undefined ? null : {
        etag: "test-etag",
        async text() { return typeof value === "string" ? value : new TextDecoder().decode(value); },
        async arrayBuffer() { return typeof value === "string" ? new TextEncoder().encode(value).buffer : value; }
      };
    },
    async put(key, value) { objects.set(key, value); }
  };
}

test("uses the bundled KAT when R2 has no live table", async () => {
  const config = await loadKat({ LINE_AGENT_CONFIG: bucket() });
  assert.equal(config.source, "bundled");
  assert.equal(config.value.agents[0].id, "homelab");
});

test("validates and versions a KAT update", async () => {
  const storage = bucket();
  const first = JSON.stringify({ schema_version: "1", agents: [{ id: "alpha", aliases: ["alpha"], actions: [] }] });
  await updateConfig({ LINE_AGENT_CONFIG: storage }, "kat", first, "Uadmin");
  const second = JSON.stringify({ schema_version: "1", agents: [{ id: "beta", aliases: ["beta"], actions: [] }] });
  const result = await updateConfig({ LINE_AGENT_CONFIG: storage }, "kat", second, "Uadmin");
  assert.equal(result.backed_up, true);
  assert.equal((await loadKat({ LINE_AGENT_CONFIG: storage })).value.agents[0].id, "beta");
  assert.ok([...storage.objects.keys()].some((key) => key.startsWith("config/revisions/")));
});
