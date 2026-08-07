---
name: Kimono Labs (raven & frost)
description: Free flagship models kimono-raven and kimono-frost at /kimono, per-model themes, 100/day limit
type: feature
---
Kimono Labs lives at `/kimono` (page `src/pages/Kimono.tsx`, edge function `kimono`).

- Two models, both FREE: `kimono-raven` (deep reasoning, violet/fuchsia theme, backed by openai/gpt-5.5) and `kimono-frost` (fast crystal-clear answers, cyan/ice theme, backed by openai/gpt-5.4).
- Switching model switches the page theme (glow gradient, accents, prompts) and switches chat history — conversations.mode is 'raven' or 'frost'.
- Limit: 100 messages per day per model per user (UTC reset), enforced server-side via `consume_model_quota(_model, _limit)` and displayed via `get_model_usage`. Usage stored in `premium_usage`.
- Never reveal underlying providers; models must identify only as kimono-raven / kimono-frost built by aikalabs.
- Mascots are emotional: models end each reply with a hidden `[[mood:neutral|happy|blush|annoyed|thinking]]` tag; the client (src/lib/kimono-emotion.ts) strips it, swaps the mascot face art (blush/annoyed/happy/thinking variants in src/assets) and plays a matching CSS reaction animation + mood badge.
- Both Kimono models run on the strongest tier (raven & frost = openai/gpt-5.5; frost uses priority fast mode).
