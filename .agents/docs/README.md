# Docs — how this template works (for humans)

This folder contains **plain-language explanations** of how the template works: the request
lifecycle, the response/error system, decorators, the form submission flow. Written for a
human being thrown into the codebase — narrative, with real examples, focused on _why_
things are shaped the way they are.

Not to be confused with:

- the repo `README.md` — getting started, setup, commands;
- `.agents/rules/README.md` — strict **rules** for writing code (what agents follow when
  generating/refactoring); if the docs and the rules ever disagree, the rules win.

| Doc                                    | What it explains                                                                                              |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `.agents/docs/request-lifecycle.md`    | What happens between "user hits enter" and "HTML lands in the browser" — Worker, Hono, services, React Router |
| `.agents/docs/responses-and-errors.md` | The two response envelopes, message keys, and every layer that catches errors                                 |
| `.agents/docs/decorators.md`           | `@actionMethod`, `@dataMethod`, `createRouteService` and the `this.throw()` convention                        |
| `.agents/docs/form-submission-flow.md` | A form's full journey: client validation → action → cookies → translated errors                               |
