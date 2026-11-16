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

`npm run dev` serves every scene. Pick one with the `scene` query parameter on the address Vite prints (normally `http://localhost:5173/`). `src/main.ts` reads the parameter with `selectScene` and builds the scene from `src/app/`; an unknown value loads the demo. The demo and sandbox step physics at a fixed 1/60 s, running as many steps as each frame's time covers (at most five), so they behave the same at any frame rate; the benchmark runs one step per frame. In every scene, bodies that stay still fall asleep and are drawn grey until something wakes them; the demo's player never sleeps.

| Scene     | Address                                                               | What it shows                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Controls                                                                                                          |
| --------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Demo      | `/`                                                                   | Walls around the window, a player box, two fixed rectangles and a stack of three crates on the floor at x = 450, with the debug layers on: outlines, normals, bounding boxes (red while touching), friction arrows and the drag line. The crates fall asleep and turn grey within a second; pushing them with the player wakes them                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | **WASD** moves the player box, **Space** jumps, **left-drag** pulls any body, resizing the window moves the walls |
| Benchmark | `/?scene=benchmark`, add `&window=settled` and/or `&pyramid=standing` | A fixed 1600×1000 world with a 2,000-body pyramid of 12×12 boxes, stepped at a fixed 1/60 s. By default the pyramid is built in mid-air with gaps and collapses as it lands; `pyramid=standing` instead builds 210 30×30 crates in 20 rows resting on the floor, which settle and turn grey within a few seconds. Sleeping bodies are drawn grey. The default `collapse` window averages 300 frames after 60 warm-up frames, while the pyramid falls and settles; `window=settled` waits 1,800 frames first. It shows `<pyramid> · <window> · N% asleep · update X ms · render Y ms · Z draw calls` under the FPS counter (the asleep share is taken when the sample ends), then lists the five slowest update systems with their average ms and share of the update. The summary line and a table of every system are logged once to the browser console | None; input and resizing are inactive                                                                             |
| Sandbox   | `/?scene=sandbox`                                                     | A fixed 1200×700 world with a floor and ceiling and a dozen circles and boxes that a steady wind pushes to the right; each body that leaves either side is replaced on the left. It is the worked example in [`docs/ecs-guide.md`](docs/ecs-guide.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | **left-drag** pulls any body; resizing has no effect                                                              |

`npm run bench` times one physics step of the benchmark scene without a browser and prints a per-system breakdown for both windows, plus how much of the pyramid is asleep over time.

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

- [`docs/`](docs/README.md) — Guides for building with the engine; start with the [ECS guide](docs/ecs-guide.md)
- [`lint/`](lint/README.md) — Local ESLint rules for this project
- [`public/`](public/README.md) — Static files Vite serves as-is
- [`scripts/`](scripts/README.md) — Node scripts used by npm scripts
- [`src/`](src/README.md) — Engine source code
- [`tests/`](tests/README.md) — Vitest tests and benchmarks
