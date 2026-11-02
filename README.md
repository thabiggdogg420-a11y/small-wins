# Small Wins

Small, practical lessons for learning to use AI: try a task, check what happened, revise it and keep a useful result. Prepared practice and external-provider handoff are distinct from optional real on-device model experiments. A completed exercise or self-report is not proof of mastery.

Core practice runs in the browser. External AI prompts are reviewed and copied by the learner, not silently sent to a provider. Optional browser-local model availability depends on the device/browser and requires explicit preparation. Do not enter sensitive information into practice examples.

## Preview locally

With Python 3 installed, from the repository root:

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory public
```

Open `http://127.0.0.1:8000/?measurement_test=1`. `public/` is the editable browser source. This static preview does not implement the production `/api/usage` endpoint or extensionless Worker routing. The current hosted build includes bounded aggregate event measurement; it is not accurate to describe it as having no measurement at all.

## Focused checks

The export checks below were verified with Node.js 24.22.1 (no dependency installation required for this subset):

```sh
node test.cjs
node measurement/test.mjs
node measurement-hooks-test.cjs
```

These are a useful starting subset, not full browser or novice-learning acceptance. All 32 root `*test.cjs` files passed in the export check. They cover specific learning/persistence flows using source/VM/DOM stubs, not rendered-browser or screen-reader acceptance. A historical host-specific browser harness is intentionally omitted. Report exactly what you ran.

The existing Worker build is `node scripts/build-measurement.mjs`, followed by `node scripts/validate-measurement.mjs`. It reads browser source, measurement endpoint and migrations, then rewrites `dist/`. This export removes the original hosting-account metadata requirement. Output includes `dist/server/index.js` and schema source in `dist/migrations/`; deployment configuration is deliberately not included. Edit `public/`, not the generated Worker. None of these commands deploys it.

## Project map

- `public/`: lesson interface, coach/state models and browser assets.
- Root `*test.cjs`: focused regression checks.
- `measurement/`, `scripts/`, `drizzle/`: aggregate measurement and Worker build source.
- Unreleased preparation/server prototypes and private QA notes are intentionally omitted from this source export.

## Help wanted

- Test a beginner journey with keyboard and small-screen layouts.
- Reproduce recovery from interrupted preparation or invalid imports.
- Improve instructions that distinguish prepared practice, self-report and real model output.
- Extend browser regression coverage for the learning and recovery routes.

## Privacy, limits and rights

Session-only and optional browser-local storage have different retention behavior. Downloaded files remain after browser deletion. Mocked model tests do not establish compatibility with every device, and developer tests do not establish real novice learning outcomes. Original platform code is MIT-licensed; preserve third-party notices and see THIRD-PARTY-NOTICES.md. See [CONTRIBUTING.md](CONTRIBUTING.md).
