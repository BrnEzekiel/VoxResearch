# Kiroween 2026 submission pack — VoxResearch (Frankenstein)

Copy-paste material for the Devpost form. Category: **Frankenstein**.
Bonus prizes to tick: **Best Kiro Crew App**, **Best Demo** (automatic),
**Social Blitz**, **Bonus Blog** (see tasks at the bottom).

---

## 1. Project description (Devpost "text description")

**VoxResearch — ask anything by voice or text, get live cited answers.**

Research today means juggling a search engine, a chatbot, a charting tool and a
PDF exporter — and trusting answers with no sources. VoxResearch stitches the
whole loop into one creature: speak or type a question, and Meta's Muse Spark
streams back a search-grounded answer with real citations you can hover, copy
or open.

The monstrous part is what happens around the answer. A detection engine reads
every response and offers 90+ presentation formats on demand: bar/line/pie/
radar charts, sortable data tables, timelines, flowcharts, maps, Venn diagrams,
math rendering, checklists, pros-and-cons, FAQs, QR codes and more. Anything can
be exported to a branded, styled PDF where diagrams render as true images — what
you see in chat is what lands on the page.

Chats live in Gemini-style sessions with pins, rename, full-text search and
one-click export. A device-fingerprint quota (10 free messages, enforced
server-side so clearing the browser doesn't reset it) makes the free tier real.
Under the hood: React + Vite + Tailwind, Vercel serverless functions, Meta Muse
Spark 1.3 with search grounding, and Muse Voice Transcribe fed by in-browser
WebM-to-WAV conversion.

Built with Kiro (Crew, specs, steering, hooks) during the Kiroween 2026
submission period.

**Try it:** https://voxresearch-app.vercel.app (no login needed)

---

## 2. How Kiro was used (Devpost write-up)

VoxResearch was conceived, planned and built inside **Kiro Crew** — the repo
still lives in the Crew workspace it was born in.

- **Spec-driven development first.** Before any code existed, `.kiro/specs/voxresearch.md`
  captured the goal, functional requirements (voice input, live grounded answers,
  result cards), non-functional constraints (FastAPI, React + Vite + Tailwind,
  env-var keys) and explicit out-of-scope items. Every build session started from
  that spec, which is why a one-person project kept coherent architecture across
  dozens of iterations instead of drifting into vibe-coded spaghetti.
- **Steering as guardrails.** `.kiro/steering/stack.md` pinned stack choices
  (FastAPI not Flask, Tailwind not plain CSS, orange-on-dark Halloween theme)
  and component conventions. Across 50+ generated features, Kiro never once
  introduced an off-stack dependency or broke the theme — steering did what code
  review normally does.
- **Hooks for safety.** `.kiro/hooks/pre-commit.json` scans for hardcoded API
  keys on every commit, so the Meta key stayed in the environment from day one.
- **Crew for scale.** Two landmark sessions shipped a 20-feature round (sessions,
  templates, PWA, voice, PDF export) and a 30-feature round (visualizations,
  batch search, compare mode, offline handling) in single sittings — work that
  would take weeks by hand. Later Crew sessions added the 90-format
  visualization engine, the Gemini-style session model, and the PDF renderer.
- **MCP for docs.** Kiro's web search pulled the Meta Model API reference live
  during planning, which is how the app targeted Muse Spark's search grounding
  and Muse Voice Transcribe correctly on the first implementation.

The difference vs plain prompting: specs made scope explicit, steering made
output consistent, and hooks made it safe — Kiro operated like a disciplined
team following project law, not an autocomplete.

---

## 3. Demo video script (under 3 minutes)

Record the browser (phone recording of the screen is fine). No music needed.
Total: ~2:30.

| Time | Show | Say |
|---|---|---|
| 0:00–0:20 | Live site, empty chat | "VoxResearch is a voice-first research assistant. I speak or type, and Meta AI answers with live sources." |
| 0:20–0:50 | Click mic, ask "What causes lightning?", answer streams with citations | "Voice is converted and transcribed, then the answer streams word by word with clickable citations." |
| 0:50–1:20 | Ask "Compare solar vs wind energy", open Visualize chips: table, chart, pros-cons | "Every answer sprouts visualizations — tables, charts, comparisons — rendered on demand." |
| 1:20–1:45 | Click PDF, open the downloaded file | "One click exports a styled PDF — diagrams included as real images." |
| 1:45–2:10 | Sidebar: sessions, pin, search, rename | "Chats live in sessions with pins, search and rename." |
| 2:10–2:30 | Scroll app + repo `.kiro` folder on GitHub | "Built with Kiro Crew from specs and steering during Kiroween 2026. Link and code in the description." |

Upload to YouTube as **public**, paste the link in the form.

---

## 4. Your tasks (only you can do these)

1. **Video** — record + upload per script above (~30 min).
2. **Social Blitz** — post on X/LinkedIn starting with `#KiroweenHackathon26`,
   your favorite thing about Kiro + how it changed your building. Paste post URL.
3. **Bonus Blog** — same story as a short blog post (Medium/Dev.to/Hashnode),
   mention it's for Kiroween 2026. Paste post URL.
4. **Submit** — Devpost → Enter a Submission → category Frankenstein,
   repo URL, app URL https://voxresearch-app.vercel.app,
   description + video + write-up from this file. Save early, edit later.
