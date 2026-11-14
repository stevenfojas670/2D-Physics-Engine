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

## Scenes

`npm run dev` serves every scene. Pick one with the `scene` query parameter on the address Vite prints (normally `http://localhost:5173/`). `src/main.ts` reads the parameter and builds the scene from `src/app/`.

| Scene     | Address             | What it shows                                                                                                                                                                                                                | Controls                                                                                                          |
| --------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Demo      | `/`                 | Walls around the window, a player box and two fixed rectangles, with the debug layers on: outlines, normals, bounding boxes (red while touching), friction arrows and the drag line                                          | **WASD** moves the player box, **Space** jumps, **left-drag** pulls any body, resizing the window moves the walls |
| Benchmark | `/?scene=benchmark` | A fixed 1600×1000 world with a 2,000-body pyramid of circles and boxes, stepped at a fixed 1/60 s. After 60 warm-up frames it averages 300 frames and shows `update X ms · render Y ms · Z draw calls` under the FPS counter | None; input and resizing are inactive                                                                             |

`npm run bench` times one physics step of the benchmark scene without a browser.

## Files

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
