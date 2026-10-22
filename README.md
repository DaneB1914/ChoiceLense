![ChoiceLens Banner](./ChoiceLens%20Refraction%20Wordmark%20Banner.png)

**ChoiceLens is an experimental AI decision-support app.** Frame a choice, compare two to five options, and explore the trade-offs through five analysis lenses.

**[Open the live beta demo](https://choicelens-decisions.ai.studio/)**

> **Beta · Portfolio Demo** — AI requests can fail or be temporarily unavailable. Review generated recommendations, scores, and assumptions before relying on them. A model confidence score is an estimate, not a measured probability of success.

## What it does

| Lens | What you can explore |
| --- | --- |
| Executive verdict | Recommendation, rationale, reversibility, alternative conditions, and an action checklist |
| Pros and cons | Scored advantages and risks, mitigations, category filters, and custom factors |
| Comparison matrix | Criteria scores and adjustable importance weights |
| SWOT | Strengths, weaknesses, opportunities, and threats for each option |
| Blind spots | Suspected biases, second-order effects, and a pre-mortem |

The app also includes sample dilemmas, AI alternative suggestions, a follow-up advisor chat, saved decisions, and Markdown report exports. Checklist progress, custom factors, and comparison weights are included in saved records and exports.

## Project background

Built with AI assistance in Google AI Studio for the **AI for App Building** course in the Google AI Professional Certificate. The original tie-breaker exercise was expanded into a multi-lens decision-support demo. This repository documents the implementation and its current limitations; it is not a claim that the AI's advice has been independently researched or validated.

The product is named **ChoiceLens**; the GitHub repository is currently named `ChoiceLense`.

## Run locally

You need **Node.js 22.12 or newer** (Node 24 is used in CI), npm, and a Gemini API key with access to the configured model.

1. Clone and install:

   ```sh
   git clone https://github.com/DaneB1914/ChoiceLense.git
   cd ChoiceLense
   npm ci
   ```

2. Copy `.env.example` to `.env` and set `GEMINI_API_KEY` to your own key. On macOS/Linux use `cp .env.example .env`; in PowerShell use `Copy-Item .env.example .env`.

3. Start the full application:

   ```sh
   npm run dev
   ```

4. Open **http://localhost:3000**. Set `PORT` in `.env` if you need another port.

The key stays on the Express server. Do not put it in browser code or a `VITE_` variable. `.env` files are excluded from Git; `.env.example` contains no credentials. In AI Studio, configure the key through its Secrets panel instead.

### Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Express API and Vite development middleware |
| `npm run typecheck` | TypeScript checks; `npm run lint` is an alias for the same check |
| `npm run build` | Build frontend assets into `dist/` |
| `npm run start:production` | Serve the built frontend and Express API; run the build first |
| `npm start` | Start the server, respecting the host's `NODE_ENV` setting |
| `npm run preview` | Preview frontend assets only; does not start the Express API |

The production command is cross-platform. Hosting environments can alternatively set `NODE_ENV=production` and use `npm start`. A static-only host cannot run the AI endpoints.

## How it is organized

- `src/App.tsx` — form/results flow, saved decisions, lens edits, and exports.
- `src/components/` — the five lenses, decision form, advisor, history, and navigation.
- `src/data/presets.ts` — example decisions.
- `src/types/decision.ts` — shared decision and analysis types.
- `src/utils/export.ts` — Markdown report formatting.
- `server.ts` — Express routes, Gemini requests, response normalization, and frontend serving.
- `vite.config.ts` — React, Tailwind, and development configuration.

The frontend calls three server endpoints: `POST /api/analyze-decision`, `POST /api/suggest-alternatives`, and `POST /api/advisor-chat`. The server is currently configured to request `gemini-3.8-flash`; model access depends on the Google environment and API key. The app does not silently substitute another model.

## Data and current limitations

- Decision history is stored in the current browser's `localStorage`, with up to 25 records retained when saving. It is not an account-backed database and does not sync between browsers or devices. Browser/site-data clearing can remove it; export reports you want to keep.
- Decision text, context, options, and follow-up messages are sent to the server and Gemini to generate responses. Avoid entering confidential information into this public demo.
- Advisor chat is held in memory for the current session, not permanently saved with decision history.
- Gemini capacity errors (including 503 responses), timeouts, and unexpected proxy responses have occurred during testing. A successful page load does not guarantee every AI feature is available. Retry later when a request fails.
- Generated scores, confidence, and conclusions can be inaccurate. The matrix is a way to explore assumptions, not an objective measurement or a guarantee.
- Public API routes currently have no application-level sign-in or rate limiting. Anyone self-hosting an internet-facing copy should configure access controls and usage limits appropriate to their deployment and API budget.

## Validation

GitHub Actions runs a clean `npm ci`, TypeScript checks, and the frontend build on pushes and pull requests. It does not use an API key or make paid model requests. Live AI behavior needs separate verification against a configured Google project.

For manual checks, see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

No license has been selected for this repository. Public visibility alone does not grant an open-source license.
