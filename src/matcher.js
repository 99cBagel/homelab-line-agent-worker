import table from "../Key_Agents_Table.json" with { type: "json" };

export const keyAgentsTable = table;

export function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function enabledActions(agent) {
  return (agent.actions || []).filter((action) => action.enabled);
}

function result(agent, action, confidence, method) {
  return {
    status: action ? "action" : "agent",
    agent_id: agent.id,
    action_id: action?.id || null,
    confidence,
    method
  };
}

export function matchLineInput(message, activeTable = table) {
  const text = normalizeText(message);
  if (!text) return { status: "menu", menu_id: "agents", confidence: 0, method: "empty" };

  for (const agent of activeTable.agents) {
    for (const action of enabledActions(agent)) {
      const aliases = [action.label, ...(action.aliases || [])].map(normalizeText);
      if (aliases.includes(text)) return result(agent, action, 1, "action_exact");
    }
  }

  for (const agent of activeTable.agents) {
    const aliases = [agent.label, ...(agent.aliases || [])].map(normalizeText);
    if (aliases.includes(text)) return result(agent, null, 0.98, "agent_exact");
  }

  const candidates = [];
  for (const agent of activeTable.agents) {
    for (const action of enabledActions(agent)) {
      for (const alias of [action.label, ...(action.aliases || [])].map(normalizeText)) {
        if (alias.length >= 4 && text.includes(alias)) candidates.push({ agent, action, alias });
      }
    }
    for (const alias of [agent.label, ...(agent.aliases || [])].map(normalizeText)) {
      if (alias.length >= 4 && text.includes(alias)) candidates.push({ agent, action: null, alias });
    }
  }
  candidates.sort((left, right) => right.alias.length - left.alias.length);
  if (candidates.length) {
    const best = candidates[0];
    return result(best.agent, best.action, 0.8, "contains_alias");
  }
  return { status: "menu", menu_id: "agents", confidence: 0, method: "no_match" };
}
