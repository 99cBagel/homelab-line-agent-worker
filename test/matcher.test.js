import assert from "node:assert/strict";
import test from "node:test";
import { matchLineInput } from "../src/matcher.js";

test("matches the Lenovo startup command to the HomeLab Agent", () => {
  assert.deepEqual(matchLineInput("Power up Lenovo"), {
    status: "action", agent_id: "homelab", action_id: "power-up-lenovo",
    confidence: 1, method: "action_exact"
  });
});

test("matches an Agent label without authorizing an action", () => {
  assert.deepEqual(matchLineInput("DocuAgent"), {
    status: "agent", agent_id: "docuagent", action_id: null,
    confidence: 0.98, method: "agent_exact"
  });
});

test("does not return disabled DocuAgent actions", () => {
  const match = matchLineInput("show documents");
  assert.equal(match.agent_id, "docuagent");
  assert.equal(match.action_id, null);
});

test("returns the Agent menu for unrelated input", () => {
  assert.equal(matchLineInput("purple banana").menu_id, "agents");
});
