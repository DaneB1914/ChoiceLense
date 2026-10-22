# Working on ChoiceLens

ChoiceLens is a beta portfolio project. Keep changes focused and preserve the form → analysis → five-lens workflow.

## Local checks

Follow the setup instructions in [README.md](README.md), then run:

```sh
npm ci
npm run typecheck
npm run build
```

Commit `package-lock.json` whenever dependencies change. Do not work around dependency conflicts with `--force` or `--legacy-peer-deps`.

## Manual verification

Use hypothetical decisions rather than private information. Real AI calls require your own API key and may incur usage charges.

1. Enter a question and two distinct options. Confirm blank and duplicate options cannot be submitted.
2. Generate an analysis and open all five lenses. Check that the options and comparison scores are populated.
3. Add a custom factor, change a comparison weight, and tick an action. Switch lenses, reload, and load the saved decision to check persistence.
4. Copy a Markdown report and check that it contains the edits.
5. Use Back to Form to check that the inputs return. Use New Analysis to check that a new decision starts blank.
6. Try alternative suggestions and advisor chat. A provider failure must release the loading state, preserve context, and offer a retry.
7. Start a request, then switch to another decision. A late response must not replace the selected decision.
8. Check a narrow mobile layout and the Methodology link. Keep the beta notice visible in form and results views.

For a production smoke check, run `npm run build` and `npm run start:production`, then open the app on the configured port. The API must run alongside the built frontend.

## Scope and privacy

- Keep secrets in `.env` locally or the host's secret settings. Never commit API keys, real decision histories, or exported personal reports.
- Keep Gemini calls server-side; do not expose credentials through a `VITE_` variable.
- AI Studio and this repository may sync in both directions. Check the current branch before pushing and avoid editing the same files in both places at once.
- Changing this repository does not by itself confirm that the published AI Studio demo has been republished. Verify the live deployment separately.
- Describe what changed and the checks run in a pull request. Do not claim a build check proves live AI availability.
