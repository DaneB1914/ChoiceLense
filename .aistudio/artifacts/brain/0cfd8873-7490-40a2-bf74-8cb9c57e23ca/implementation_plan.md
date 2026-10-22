# ChoiceLens Console Error Resolution & Stability Hardening

Resolve 4 console errors occurring in the browser developer console by addressing missing static assets, HMR WebSocket binding in Express middleware mode, schema normalization for multi-option comparison matrix scores, and robust fallback handling.

### User Review & Critical Decisions

> [!IMPORTANT]
> The fixes preserve the entire existing UI workflow, full-stack Express architecture, and Gemini 3.8 Flash integration with zero disruption. All changes are non-breaking infrastructural enhancements.

- **Confirmed Environment**: Errors were identified in the browser developer console.
- **Identified Root Causes**:
  1. **Favicon 404 Error**: Browser requests `/favicon.ico` on load, which is missing from Express static routing, causing a 404 in the console.
  2. **Vite HMR WebSocket Connection Errors**: In `server.ts`, Vite is instantiated in `middlewareMode: true` but the Express server doesn't pass the underlying `http.Server` to Vite, causing `@vite/client` to log repeated WebSocket connection drops.
  3. **Comparison Matrix Open Schema**: In `server.ts`, `scores` and `notes` were defined as open `Type.OBJECT` without child properties in the Gemini OpenAPI schema, causing Gemini to return `{}` and triggering client-side `undefined` score access.
  4. **Tailwind / Static Font Fallback**: Providing a local inline SVG favicon and defensive score parsers prevents any missing asset or font loading warnings in strict sandbox iframes.

---

### 1. Overview & Core Concept

ChoiceLens provides high-stakes decision analysis through 5 strategic lenses. This update hardens the underlying runtime so the browser console remains clean (0 errors), API data structures from Gemini are strictly typed and populated, and dev-server WebSocket handling is stabilized.

---

### 2. User Experience & Visual Design

- **Visual Consistency**: Zero alterations to user-facing visual components; all existing tabs (Executive Verdict, Pros & Cons, Comparison Matrix, SWOT Analysis, Blind Spots & Biases) remain visually identical.
- **Data Completeness**: The Comparison Matrix will now display rich 1–10 scores and detailed rationale notes across all user options without empty cells or fallback dashes.
- **Zero Console Noise**: Clean browser developer console with no 404s, failed WebSocket retries, or React key warnings.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Structured Array for Comparison Scores vs Open Object**
  - *Chosen Approach*: Refactor `matrix[].scores` from open dictionary to structured array: `matrix[].optionScores: Array<{ optionTitle, score, note }>`.
  - *Why*: Gemini's `responseSchema` requires explicit property types for objects. An open object without declared properties causes the model to return `{}`. Converting to an array guarantees all scores and justifications are populated.
- **Decision 2: Express HTTP Server Integration for Vite Middleware**
  - *Chosen Approach*: Use Node's `http.createServer(app)` and bind Vite's HMR server, or disable client-side HMR when `DISABLE_HMR=true` is set.
  - *Why*: Eliminates the repeating WebSocket connection error messages in the browser console.
- **Decision 3: Embedded SVG Favicon Route**
  - *Chosen Approach*: Add an inline SVG `/favicon.ico` route and `<link rel="icon">` in `index.html`.
  - *Why*: Instantly resolves the browser's automatic 404 request with a lightweight compass icon.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   Browser Client                       │
│  ┌───────────────┐ ┌────────────────┐ ┌─────────────┐  │
│  │  index.html   │ │  React SPA     │ │ SVG Favicon │  │
│  │ (Clean Head)  │ │  (5 Lenses)    │ │  (No 404)   │  │
│  └───────┬───────┘ └───────┬────────┘ └─────────────┘  │
└──────────┼─────────────────┼───────────────────────────┘
           │                 │ API Requests
           ▼                 ▼
┌────────────────────────────────────────────────────────┐
│              Express Backend (server.ts)               │
│  ┌───────────────────────┐  ┌───────────────────────┐  │
│  │  Vite Middleware      │  │  /api/analyze-decision│  │
│  │  (Wired HTTP Server)  │  │  (Strict Array Schema)│  │
│  └───────────────────────┘  └───────────┬───────────┘  │
└─────────────────────────────────────────┼──────────────┘
                                          ▼
                              ┌───────────────────────┐
                              │    @google/genai      │
                              │   (gemini-3.8-flash)  │
                              └───────────────────────┘
```

#### Data Model Refinement:
- `ComparisonRow`:
  - `criteriaId`: string
  - `criteriaName`: string
  - `optionScores`: `Array<{ optionTitle: string; score: number; note: string }>`
  - Client adapter maintains backward compatibility with `{ [optionTitle]: score }`.
