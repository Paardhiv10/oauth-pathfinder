import { runAgent, type AgentEvent } from "./agent";

// Live generation runs on Claude. Haiku is the default: about $0.10 per guide in testing.
export const modelName = () => process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";
export const isConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

export function generateGuide(app: string, emit: (e: AgentEvent) => void, signal?: AbortSignal) {
  if (!isConfigured()) throw new Error("No model key is configured: set ANTHROPIC_API_KEY.");
  return runAgent(app, emit, { apiKey: process.env.ANTHROPIC_API_KEY!, model: modelName(), signal });
}
