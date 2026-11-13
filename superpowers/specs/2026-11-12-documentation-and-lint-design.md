# Documentation, Lint, and Repo Rules — Design

Date: 2026-11-12
Branch: `docs/agents-and-readmes` (cut from `dev` after fast-forwarding `dev` to include `feature/editor-and-actors`)

## Intent

The repo is about to be worked on with AI agents for the first time. Before that happens, it needs:

- a short `AGENTS.md` that tells an agent the rules and points it to the README,
- a README in every folder of the TypeScript engine that maps each file to what it does,
- lint that enforces the rules mechanically instead of relying on anyone remembering them,
- code that documents itself, with no comments,
- a place (`superpowers/`) for specs and plans.

Success: an agent (or the owner, months later) can open the repo cold, read `AGENTS.md`, follow links to the right folder README, and find any file's purpose without opening it; and `npm run lint` fails on anything that breaks the rules.

## Scope

Two engines live in the repo:

- `engine/` — the legacy vanilla-JS engine. It is the owner's playground for manual programming. **Nothing in `engine/` changes.** No READMEs, no lint, no comment removal. Agents must not modify it unless explicitly asked.
- `engine-typescript/` — the active engine (Vite + TypeScript). All work below targets it.

## Goals

1. Root `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, rewritten root `README.md`.
2. A `README.md` in every folder of `engine-typescript/` mapping its files.
3. `superpowers/` folder with `specs/` and `plans/`.
4. ESLint + Prettier set up in `engine-typescript/`, enforcing the rules in this document.
5. All comments removed from `engine-typescript/`, with names improved so the code stays understandable.
6. Naming, import, and export cleanup so the code passes the new lint.
7. TypeScript `strict` mode on, with resulting type errors fixed.
8. Architecture layer rules enforced by lint, with today's violations listed as explicit exceptions.

## Non-goals

- Unit tests and a test runner (separate, next project).
- Moving draw code out of the physics layer (deferred to the testing project; see Architecture).
- The editor and actors (later, after this project).
- CI workflows.
- Any change to `engine/`.
- Any change to physics behaviour.

## Anti-goals (failure even if lint passes)

- The simulation behaves differently after the cleanup.
- Comments are deleted but the code is left cryptic — a reader who relied on the comment can no longer tell what the code does.
- READMEs that drift out of sync with the files they describe.

## Root files

### `AGENTS.md`

Short — readable in about a minute. Contents:

- **Map:** `engine/` is the owner's manual playground — do not modify unless asked, do not add docs to it. `engine-typescript/` is the active engine. `superpowers/` holds specs and plans. Point to `README.md` for everything else.
- **Rules:**
  - No comments in code. Code documents itself through names and structure.
  - Run lint, type check, and build in `engine-typescript/` before calling work done.
  - When adding, removing, or renaming a file, update its folder's README in the same change.
  - Respect the architecture layers (link to README section).
  - Read `CONTRIBUTING.md` before branching, committing, or opening a PR.
  - Specs go in `superpowers/specs/`, plans in `superpowers/plans/`.

`engine-typescript/AGENTS.override.md` is deleted. Its TSDoc rule is replaced by the no-comments rule; its folder map is superseded by the folder READMEs.

### `CLAUDE.md`

One line: `@AGENTS.md`. Claude Code reads `CLAUDE.md`, not `AGENTS.md`; this keeps one source of truth. *(Builder's-designer call.)*

### `CONTRIBUTING.md`

- **Branch model:** `main` is releases only. `dev` is integration. All work branches from `dev` and returns to `dev` by PR.
- **Branch names:** `<type>/<kebab-case-description>`, types:
  - `feature/` — new behaviour
  - `fix/` — bug fixes
  - `refactor/` — restructuring without behaviour change
  - `docs/` — documentation only
  - `test/` — adding or changing tests
  - `chore/` — tooling, config, dependencies
  - `migration/` — porting to another language
- **Commits:** Conventional Commits, `<type>: <imperative summary>`, e.g. `docs: add folder READMEs`. Types mirror branch types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `migration`. Lowercase type, imperative mood, no trailing period.
- **Before a PR:** lint, type check, and build pass in `engine-typescript/`; folder READMEs are current.

### Root `README.md`

Rewritten. Contents:

- What the project is (a 2D physics engine following Millington's *Game Physics Engine Development*). Keep the existing screenshots and the Goals list.
- The two engines and their status (`engine/` legacy JS playground; `engine-typescript/` active).
- Getting started: `cd engine-typescript`, `npm install`, `npm run dev`. The legacy engine still opens via Live Server.
- npm scripts: `dev`, `build`, `preview`, `lint`, `format`.
- The full lint rules (below), in plain language.
- The architecture layers diagram and the exceptions list, and how exceptions get removed.
- Repo layout, linking to `engine-typescript/README.md` and onward.
- Workflow: link to `CONTRIBUTING.md`; specs and plans in `superpowers/`.

## Folder READMEs

Every folder inside `engine-typescript/` gets a `README.md`, except ignored folders (`node_modules/`, `dist/`). No READMEs in `engine/`.

Format of each:

1. Heading with the folder name.
2. One line: what the folder is for, and which architecture layer it belongs to (where applicable).
3. A table: each file in the folder → one-line description of what it does.
4. A list of subfolders, each linking to its README with a one-line description.

`engine-typescript/README.md` (currently template text with a fake API example, a wrong folder layout, and a false MIT licence claim) is rewritten into this format, covering the project's top-level files (`index.html`, `package.json`, `tsconfig.json`, `vite.config.ts`, etc.).

### README sync check

A small Node script in `engine-typescript/scripts/` checks that, for every folder in scope, each file and subfolder is listed in that folder's README, and that the README lists nothing that doesn't exist. It runs as part of `npm run lint`. Files ignored by `.gitignore` are excluded; `README.md` itself is excluded; dotfiles and config files (`.gitignore`, `package-lock.json`, etc.) are included and must be listed. The script is plain Node JavaScript (`.mjs`) so it runs without a build step. *(Designer's calls; the scripts folder gets its own README like every other folder.)*

## `superpowers/`

At repo root:

- `superpowers/README.md` — explains the folder and naming.
- `superpowers/specs/YYYY-MM-DD-<topic>-design.md`
- `superpowers/plans/YYYY-MM-DD-<topic>.md`

This document is the first spec.

## Lint and formatting

Tooling: ESLint (flat config) with typescript-eslint, plus Prettier, installed in `engine-typescript/`. New scripts: `npm run lint` (ESLint + `prettier --check` + README sync check, so formatting breaks fail lint) and `npm run format` (Prettier write). *(Designer's call.)* The type check (`tsc`) stays in `npm run build`; the builder may add a separate `typecheck` script.

### Rules

1. **No comments.** A small local ESLint rule (defined in the ESLint config, no extra dependency) reports every comment in `.ts` files — line, block, TSDoc, TODOs, commented-out code. Inline config is disabled (`linterOptions.noInlineConfig: true`), so `// eslint-disable` cannot be used as an escape hatch. The comment section labels in `tsconfig.json` are removed too.
2. **Formatting** matches the existing style: tabs, double quotes, no semicolons. Enforced by Prettier, with ESLint's formatting rules turned off (`eslint-config-prettier`). Print width is left to the builder; pick whatever causes the least churn.
3. **Naming:**
   - Classes, types, interfaces: PascalCase.
   - Methods, functions, variables, parameters: camelCase. Renames include `Vector2.Normalize`, `Dot`, `Cpy`, `Add_Cpy`, `Multiply_Cpy`, `Log`, the free functions `Add`/`Sub`/`Scale`/`ComponentProduct`, `MathHelper.Index`, `Simulation.SpawnObject`. Abbreviated names may be expanded (e.g. `Cpy` → `copy`) where that makes them clearer.
   - No leading underscores on parameters (`_x` → `x`).
   - Constants may use UPPER_CASE (e.g. `DEFAULT_COLLISION`).
   - File names match the class they export: `SprintJoints.ts` → `SpringJoint.ts`, `Staticbody.ts` → `StaticBody.ts`, `MathHelpers.ts` → `MathHelper.ts`.
   - `Rigidbody` → `RigidBody` (class and file), for consistency with `StaticBody`. *(Designer's call.)*
   - Type files use one suffix: `.types.ts` (so `collisionGroups.type.ts` → `collisionGroups.types.ts`, `controller.type.ts` → `controller.types.ts`). *(Designer's call.)*
   - Typo fixes: `Material.setRestituion` → `setRestitution`.
   - Folder names stay camelCase as they are.
4. **Imports:** cross-folder imports use the `@/` alias; same-folder imports use `./`. `../` is banned. `import type` stays for type-only imports (`verbatimModuleSyntax` requires it).
5. **Exports:** named exports only; no `export default`. `MathHelpers.ts`'s default export is removed and consumers updated. `vite.config.ts` is exempt, since Vite requires a default export. *(Designer's call.)*
6. **Unused code:** the existing `noUnusedLocals`/`noUnusedParameters` stay. Unused Vite template assets in `src/assets/` are deleted. The unused `vite-tsconfig-paths` dependency is removed. *(Designer's call.)*
7. **`strict: true`** in `tsconfig.json`. Resulting type errors are fixed without changing behaviour: prefer type-level fixes (definite-assignment assertions, narrower types) over new runtime guards. *(Designer's call.)*

Stubs (`shapes/Cone.ts`, `optimizations/boundingVolumes/ConvexHull.ts`, the unimplemented methods in `shapes/Shape.ts`) stay as they are, with only their comments removed. *(Designer's call.)*

Also fix while here: `index.html` links a non-existent `styles.css` (the real stylesheet is imported from `main.ts`) — remove the dead link. *(Designer's call.)*

### Removing comments without losing meaning

Comments in `engine-typescript/` (~250 TSDoc blocks, ~136 line comments, ~18 lines of commented-out code, several TODO markers) are all removed. Where a comment carried information the code doesn't, carry it into the code: rename variables/methods, extract a well-named function or constant, or introduce a named type. Commented-out code is deleted outright. TODO/"Need to implement" markers are deleted; open work belongs in the README Goals list or a spec, not the code.

## Architecture

### Layers

```
math        Vector2.ts, utils/MathHelper.ts            → imports nothing
physics     RigidBody, StaticBody, shapes/,             → math, types
            collisionDetectionSystem/, joints/,
            materials/, particles/, optimizations/,
            Simulation.ts
rendering   utils/DrawUtils.ts                          → math, physics, types
input       Controller.ts                               → types
app         main.ts                                     → anything
types       types/                                      → types only; importable by every layer
```

Rules:

- A layer may import only the layers listed for it.
- `math` and `physics` must not use DOM globals (`window`, `document`, `requestAnimationFrame`, etc.).
- Layers are assigned by file path; no folders are moved. *(Designer's call.)*
- Enforcement tool is left to the builder (`eslint-plugin-boundaries` or per-path `no-restricted-imports`/`no-restricted-globals` overrides both work).

### Exceptions

Today, physics code draws to the canvas. Moving that out is a refactor deferred to the testing project. Until then, these imports are allowed as explicit exceptions, listed by file path in the ESLint config (not by comments):

- `shapes/Shape.ts`, `shapes/Circle.ts`, `shapes/Polygon.ts` → `utils/DrawUtils.ts`
- `collisionDetectionSystem/CollisionManifold.ts` → `utils/DrawUtils.ts`
- `joints/JointConnection.ts` → `utils/DrawUtils.ts`
- `optimizations/grids/SpatialGrid.ts` → `utils/DrawUtils.ts`
- `Simulation.ts` → `utils/DrawUtils.ts`, `Controller.ts`

The builder should verify this list against the code and add any exception actually needed for the current code to pass, keeping the list as short as possible. `draw(ctx: CanvasRenderingContext2D)` methods on physics classes remain until the refactor. The exceptions list is mirrored in the root README so the debt is visible; the refactor removes entries until the list is empty.

## Verification

There are no tests yet, so:

- `npm run lint`, the type check, and `npm run build` all pass in `engine-typescript/`.
- The README sync check passes.
- `grep` for `//` and `/*` in `engine-typescript/src` finds no comments (string literals like URLs excepted).
- The owner runs `npm run dev` and confirms the demo scene behaves as before (bodies fall and collide, joints work, mouse dragging and WASD movement work, grid debug draw shows).
- `engine/` has no diff.

## Before the PR

`origin/dev` is two commits behind local `dev` (the fast-forward to include the file reorganisation hasn't been pushed). Push `dev` first, with the owner's OK, so the PR into `dev` shows only this branch's work.

## Left to the builder

- Order of work and commit breakdown (following the commit convention above).
- Exact README wording.
- Exact ESLint plugin choices and config layout.
- Prettier print width.
- Exact replacement names when expanding abbreviations or removing comments, as long as they follow the naming rules and behaviour is unchanged.
