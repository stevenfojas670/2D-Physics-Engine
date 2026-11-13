# engine-typescript

The active TypeScript port of the 2D physics engine, built and served with Vite. See the [root README](../README.md) for the project overview, lint rules and architecture layers.

## Getting started

```sh
npm install
npm run dev
```

| Script              | What it does                                       |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Starts the Vite dev server with the demo scene     |
| `npm run build`     | Type checks with `tsc`, then builds into `dist/`   |
| `npm run preview`   | Serves the built `dist/`                           |
| `npm run lint`      | ESLint, Prettier check and the folder README check |
| `npm run format`    | Rewrites files with Prettier                       |
| `npm run typecheck` | Type checks without building                       |
| `npm run test`      | Runs the Vitest tests in `tests/`                  |
| `npm run bench`     | Runs the Vitest benchmarks in `tests/`             |

| File                | Purpose                                                           |
| ------------------- | ----------------------------------------------------------------- |
| `.gitignore`        | Files git ignores: dependencies, build output, logs, editor files |
| `.prettierignore`   | Files Prettier skips                                              |
| `.prettierrc.json`  | Formatting rules: tabs, double quotes, no semicolons              |
| `eslint.config.js`  | ESLint config that enforces the repo's code rules                 |
| `index.html`        | Page shell with the `myCanvas` canvas; loads `src/main.ts`        |
| `package-lock.json` | Locked dependency versions                                        |
| `package.json`      | npm scripts and dependencies                                      |
| `tsconfig.json`     | TypeScript compiler options and the `@/` to `src/` path alias     |
| `vite.config.ts`    | Vite and Vitest config: the `@/` alias and where tests live       |

## Folders

- [`lint/`](lint/README.md) — Local ESLint rules for this project
- [`public/`](public/README.md) — Static files Vite serves as-is
- [`scripts/`](scripts/README.md) — Node scripts used by npm scripts
- [`src/`](src/README.md) — Engine source code
- [`tests/`](tests/README.md) — Vitest tests and benchmarks
