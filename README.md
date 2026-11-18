# Learn4Free

[Open Learn4Free](https://learn.free4allhub.com) · [Free4AllHub — all projects](https://free4allhub.com) · Repository name remains `small-wins` for existing links.

Small, practical lessons for learning to use AI: try a task, check what happened, revise it and keep a useful result. Prepared practice and external-provider handoff are distinct from optional real on-device model experiments. A completed exercise or self-report is not proof of mastery.

Core practice runs in the browser. External AI prompts are reviewed and copied by the learner, not silently sent to a provider. Optional browser-local model availability depends on the device/browser and requires explicit preparation. Do not enter sensitive information into practice examples.

## Preview locally

With a current supported Node.js installed, from the repository root:

```sh
node scripts/preview-local.cjs
```

Open `http://127.0.0.1:8000/?measurement_test=1`. This dependency-free preview serves `public/` read-only on this computer, including extensionless lesson routes. For a busy port use `node scripts/preview-local.cjs 8080` and open port 8080 instead. Stop with Ctrl+C. It rejects write requests and does not expose the source tree or implement hosted `/api/usage` services. `node local-preview-test.cjs` checks its HTTP routing and boundaries.

Python 3 remains an alternative: `python3 -m http.server 8000 --bind 127.0.0.1 --directory public`. That simple static server does not implement extensionless Worker routing; use the `.html` lesson links.

No build or package installation is needed to preview the browser pages. `dist/` is a generated Worker bundle, not a static preview folder. External provider links still open external sites when chosen. Browser-local model availability depends on your browser, and each lesson's saving rules still apply. Changing host or port does not transfer browser-local storage: keep downloaded work before leaving. The hosted site has bounded aggregate event measurement; this local preview does not provide its backend.

## Focused checks

The export checks below were verified with Node.js 24.22.1 (no dependency installation required for this subset):

```sh
node test.cjs
node measurement/test.mjs
node measurement-hooks-test.cjs
```

These are a useful starting subset, not full browser or novice-learning acceptance. The current root `*test.cjs` suite is checked as part of the contributor export. They cover specific learning/persistence flows using source/VM/DOM stubs, not rendered-browser or screen-reader acceptance. A historical host-specific browser harness is intentionally omitted. Report exactly what you ran.

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

## Portable changed-task lesson pack

Open `/lesson-pack.html` for a paper-friendly two-task worksheet and a separate checking/facilitator guide, with plain-text downloads. The second task changes output type and requires independent arithmetic plus identifying an unknown. No script, account, AI, added tracking, stored answers or progress-format change. Keep first attempt and support separate from correction. This is a prepared lesson, not evidence that a beginner learned or retained the method. Run `node lesson-pack-test.cjs` to check links, answer separation and lesson arithmetic.

## Beginner reassurance and standalone worksheet (public v55 source)

The worksheet text now points explicitly to its separate checking guide, so a downloaded copy does not depend on page context. Beginner practice explains the distinction between a first attempt and feedback, and that stored practice can be reset. Run `node lesson-pack-test.cjs` and `node beginner-reassurance-test.cjs`; these source/DOM checks do not establish human learning outcomes or complete native reset-dialog acceptance.

## Current released source (public v92)

This contributor export now includes the released stock-list lesson at `/ai-stock.html`, timetable lesson at `/ai-schedule.html`, notes-to-CSV lesson at `/notes-csv.html`, and job-application workshop at `/application-workshop/`. See SOURCE.md for provenance, exclusions and limitations.

Run all included source/VM regression suites from the repository root:

```sh
for test in *test.cjs; do node "$test" || exit; done
node measurement/test.mjs
node scripts/build-measurement.mjs
node scripts/validate-measurement.mjs
```

Some tests create fictional output fixtures under `verification/`; these generated outputs are ignored. The checked-in poster fixture and timetable baselines are synthetic test dependencies, not real learner submissions or browser acceptance receipts. Use fictional content when testing. No new browser or learner acceptance is claimed by a source sync.
