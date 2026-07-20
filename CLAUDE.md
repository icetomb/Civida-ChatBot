# Civida-ChatBot — project guide

A call-deflection support chatbot prototype for Civida (Edmonton community housing).
Spec + single source of truth for content/links: `Tasks/Civida-Chatbot-Prototype-Spec.md`.

## Hard constraints
- `index.html` is the entire app: single self-contained file, opens by double-click
  from `file://`. No framework, no build step, no CDN/external assets, no backend.
- Scripted decision tree only — buttons; no free-text input, no runtime AI.
- All bot copy is DRAFT pending Customer Success sign-off; content edits happen in
  the `CONTENT` object inside `index.html` (`<script id="core">`), nothing else.
- The `<script id="core">` block must stay DOM-free — the Node tests extract and
  evaluate it directly (`node:vm`). DOM code lives only in the second script block.

## Commands
- Tests: `node --test tests/core.test.mjs` (zero dependencies; Node ≥ 20).
  Note: pass the file path explicitly — a bare `tests/` directory arg fails on
  this machine's Node.

## Conventions
- **Rayan handles all git commits — never commit or push.**
- Every session: write a log per `Claude Logs/LOGGING_FORMAT.md`, overwrite
  `Claude Logs/CURRENT_CONTEXT.md` sections in place, and prepend a row to
  `Claude Logs/SESSION_INDEX.md`.
- Brand palette in `index.html` was sampled from civida.ca's compiled theme CSS
  (purple `#452283`, ink `#231142`, coral `#dc5339`, amber `#ffaa2d`); swap the
  `:root` tokens if the brand team supplies official values (spec §9.4).
