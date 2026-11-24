const FEATURES = [
  { tool: "Kiro Crew", action: "Project planning, category selection, architecture design" },
  { tool: "Spec-driven dev", action: "Wrote .kiro/specs/voxresearch.md before any code" },
  { tool: "Steering docs", action: ".kiro/steering/stack.md kept Kiro on FastAPI + React" },
  { tool: "Hooks", action: ".kiro/hooks/pre-commit.json guards against hardcoded API keys" },
  { tool: "Kiro Crew MCP", action: "Used web search MCP to look up Meta Model API docs live" },
  { tool: "Meta Muse Spark", action: "LLM backbone with search grounding for cited answers" },
  { tool: "Meta Voice Transcribe", action: "Speech-to-text for voice queries" },
  { tool: "SSE streaming", action: "Backend streams tokens as they arrive — no waiting" },
  { tool: "Kiro Crew", action: "Debugged API errors, fixed syntax bugs, iterated UI" },
  { tool: "Kiro Crew", action: "Generated all 40+ features across 20 iterations" },
];

export default function KiroTimeline({ dark, onClose }) {
  const bg = dark ? "bg-gray-950 text-gray-100" : "bg-gray-50 text-gray-900";
  const card = dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200 shadow-sm";
  const dot = "bg-orange-500";

  return (
    <div className={`min-h-screen ${bg} px-4 py-10`}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-orange-500">How Kiro Built This</h1>
            <p className={`text-sm mt-1 ${dark ? "text-gray-400" : "text-gray-500"}`}>Every Kiro feature used in VoxResearch</p>
          </div>
          <button onClick={onClose} className="text-orange-500 hover:text-orange-400 text-sm font-medium">Back to app</button>
        </div>

        <div className="relative">
          <div className={`absolute left-4 top-0 bottom-0 w-px ${dark ? "bg-gray-800" : "bg-gray-200"}`} />
          <div className="space-y-6 pl-12">
            {FEATURES.map((f, i) => (
              <div key={i} className="relative">
                <div className={`absolute -left-8 top-3 w-3 h-3 rounded-full ${dot} ring-4 ${dark ? "ring-gray-950" : "ring-gray-50"}`} />
                <div className={`rounded-xl border p-4 ${card}`}>
                  <span className="text-xs font-semibold text-orange-400 uppercase tracking-widest">{f.tool}</span>
                  <p className={`mt-1 text-sm ${dark ? "text-gray-300" : "text-gray-600"}`}>{f.action}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`mt-10 rounded-2xl border p-5 ${card}`}>
          <h2 className="text-orange-400 font-semibold mb-3">Kiro Features Used</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {["Kiro Crew", "Spec-driven development", "Steering documents", "Agent hooks", "MCP web search", "Custom agents", "Iterative debugging", "Multi-turn context"].map(f => (
              <div key={f} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                <span className={dark ? "text-gray-300" : "text-gray-600"}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
