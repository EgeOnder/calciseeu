# Contributing to ISEEU Hesaplama

Thanks for taking the time to contribute! 🎉

This document explains how to set up the project and the conventions we follow.

## Code of Conduct

By participating, you agree to uphold our [Code of Conduct](CODE_OF_CONDUCT.md). Please be respectful.

## Getting started

1. **Fork** the repository and clone your fork.
2. Install [Bun](https://bun.sh) if you don't have it.
3. Install dependencies and start the dev server:
    ```bash
    bun install
    bun run dev
    ```
4. Create a branch for your change:
    ```bash
    git checkout -b feat/short-description
    ```

## Before you open a PR

Run all checks locally — CI runs the same steps:

```bash
bun run lint     # oxlint
bun run build    # next build (catches type errors)
```

Please make sure:

- [ ] `bun run lint` passes.
- [ ] `bun run build` succeeds (no type errors).
- [ ] The app still works in the browser (test the affected steps).

## Conventions

- **Language** — UI strings (anything the user sees) are written in **Turkish**. Everything in code — comments, variable names, identifiers — must be in **English**.
- **Components** — UI primitives live in `components/ui` (shadcn). Feature code lives under `src/`.
- **Calculation** — all ISEEU math lives in [`src/lib/iseeu.ts`](src/lib/iseeu.ts) and must stay pure and testable. If you change a formula, cite your source in the PR description.
- **Formatting** — match the existing style (tabs, single quotes). Keep changes focused.
- **Commits** — short, imperative messages (e.g. `Add ISPEU limit warning`). [Conventional Commits](https://www.conventionalcommits.org/) are appreciated but not required.

## Reporting bugs & requesting features

Use the [issue templates](https://github.com/EgeOnder/calciseeu/issues/new/choose). Include steps to reproduce for bugs.

> ⚠️ This is an **estimation** tool, not official software. Please don't open issues claiming the result "should" match an official CAF figure exactly — instead, point to the specific rule/source you believe is implemented incorrectly.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
