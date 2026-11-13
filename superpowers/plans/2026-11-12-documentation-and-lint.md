# Documentation, Lint, and Repo Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `engine-typescript/` enforced lint rules (no comments, naming, imports/exports, layers), self-documenting code, a README map in every folder, and root `AGENTS.md`/`CLAUDE.md`/`CONTRIBUTING.md`/`README.md`.

**Architecture:** ESLint flat config with typescript-eslint and Prettier, plus a small local ESLint plugin (`engine-typescript/lint/`) holding three project rules: `no-comments`, `layers`, `filename-matches-export`. A Node script checks folder READMEs against the file tree. Each refactor task turns on its rule and makes the code pass it, so `npm run lint` is green at the end of every task.

**Tech Stack:** TypeScript 6, Vite 8, ESLint (flat config), typescript-eslint, Prettier, eslint-config-prettier, Node (`.mjs` script).

**Spec:** `superpowers/specs/2026-11-12-documentation-and-lint-design.md`. Read it before starting any task.

## Context

The owner is about to start working with AI agents on this repo. The spec settled the rules and docs. This plan turns them into ordered, verifiable tasks on branch `docs/agents-and-readmes`.

## Global Constraints

- Never modify anything under `engine/`. `git diff dev -- engine/` stays empty.
- No physics behaviour changes. Every refactor is a rename or move, or a type-only change.
- No comments in any linted file, including the lint rules and scripts this plan adds.
- Formatting: tabs, double quotes, no semicolons.
- Commits use Conventional Commits, `<type>: <imperative summary>`, with types `feat|fix|refactor|docs|test|chore|migration`. Each commit ends with the session attribution lines.
- Run all npm commands from `engine-typescript/`.
- Windows has a case-insensitive file system, so case-only renames need two steps: `git mv A.ts tmp.ts` then `git mv tmp.ts a.ts`.
- Do renames with the TypeScript language service (LSP rename / editor "Rename Symbol"), not text search-and-replace. `Vector2` has instance methods and free functions with the same names (`Add`, `Sub`, `Scale`).

## Review Focus

1. **Case-only renames that git never records.** The build passes on Windows but breaks on any case-sensitive machine. Owned by Task 3: `git ls-files src` must show `StaticBody.ts` and `RigidBody.ts`.
2. **In-place and copying `Vector2` methods getting swapped during renames** (`Add` vs `Add_Cpy`). Physics silently goes wrong. Owned by Task 3: the rename map below is applied by symbol, and the diff of `Vector2.ts` is checked line by line against it.
3. **Comment stripping deleting real code or string content.** Examples: a trailing `//` after code, or `//` inside a URL string. Owned by Task 5: the `npm run build` output and the diff are checked for removed non-comment lines.
4. **Strict-mode fixes adding runtime guards that change behaviour** (early `return`, `?? 0`). Owned by Task 6: the diff must contain only type-level changes.
5. **Folder READMEs going stale after a later rename.** Owned by Task 8: the README check runs in `npm run lint`, and a planted extra file must fail it.

---

### Task 1: Commit spec, plan, and `superpowers/` README

**Files:**
- Create: `superpowers/README.md`, `superpowers/plans/2026-11-12-documentation-and-lint.md` (copy of this plan)
- Existing: `superpowers/specs/2026-11-12-documentation-and-lint-design.md`

- [ ] **Step 1:** Write `superpowers/README.md`. It explains that `specs/` holds design docs named `YYYY-MM-DD-<topic>-design.md` and `plans/` holds implementation plans named `YYYY-MM-DD-<topic>.md`, and that a plan links the spec it implements.
- [ ] **Step 2:** Copy this plan to `superpowers/plans/2026-11-12-documentation-and-lint.md`.
- [ ] **Step 3: Commit**
```bash
git add superpowers
git commit -m "docs: add documentation and lint spec and plan"
```

### Task 2: Lint and format tooling baseline

**Files:**
- Modify: `engine-typescript/package.json`, `engine-typescript/index.html`, `engine-typescript/tsconfig.json` (Prettier reformat only)
- Create: `engine-typescript/eslint.config.js`, `engine-typescript/.prettierrc.json`, `engine-typescript/.prettierignore`
- Delete: `engine-typescript/src/assets/` (hero.png, typescript.svg, vite.svg)

**Interfaces:**
- Produces: the `lint`, `format` and `typecheck` scripts, and an `eslint.config.js` that later tasks extend.

- [ ] **Step 1:** Run `npm install -D eslint @eslint/js typescript-eslint prettier eslint-config-prettier globals` and `npm uninstall vite-tsconfig-paths`.
- [ ] **Step 2:** Create `.prettierrc.json` with `{ "useTabs": true, "semi": false, "singleQuote": false }` and a `printWidth` that minimises churn (try 80, then 100, and keep whichever reformats fewer lines in `src`). Create `.prettierignore` containing `package-lock.json` and `dist`.
- [ ] **Step 3:** Create `eslint.config.js` with:
  - `@eslint/js` recommended and typescript-eslint `recommended`, applied to `**/*.{ts,js,mjs}`
  - `eslint-config-prettier` last
  - `linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: "error" }`
  - ignores `dist`, `node_modules`
  - browser globals for `src`, node globals for config files and `scripts/`
- [ ] **Step 4:** Add these scripts to `package.json`:
  - `"lint": "eslint . && prettier --check ."`
  - `"format": "prettier --write ."`
  - `"typecheck": "tsc --noEmit"`

  Keep `dev`, `build` and `preview` as they are. Task 8 appends the README check to `lint`.
- [ ] **Step 5:** Remove `<link rel="stylesheet" href="styles.css" />` from `index.html`. Delete `src/assets/`. Run `grep -r "assets/" src` and expect no output.
- [ ] **Step 6:** Run `npm run format`, then `npm run lint`. Fix whatever the recommended rules report without changing behaviour.

  Expected: lint exits 0.
- [ ] **Step 7:** Run `npm run build`. Expected: exit 0.
- [ ] **Step 8:** Commit as `chore: add eslint and prettier tooling`.

### Task 3: Naming rules and renames

**Files:**
- Create: `engine-typescript/lint/plugin.js` (the local plugin that exports `rules`), `engine-typescript/lint/filenameMatchesExport.js`
- Rename (two-step where only case changes):

  | From | To |
  |---|---|
  | `src/Staticbody.ts` | `src/StaticBody.ts` |
  | `src/Rigidbody.ts` | `src/RigidBody.ts` |
  | `src/joints/SprintJoints.ts` | `src/joints/SpringJoint.ts` |
  | `src/utils/MathHelpers.ts` | `src/utils/MathHelper.ts` |
  | `src/types/collisionGroups/collisionGroups.type.ts` | `src/types/collisionGroups/collisionGroups.types.ts` |
  | `src/types/controller/controller.type.ts` | `src/types/controller/controller.types.ts` |

- Modify: every importer of the renamed files and symbols. Representative files: `src/Simulation.ts`, `src/collisionDetectionSystem/CollisionManifold.ts`, `src/shapes/Polygon.ts`, `src/particles/Particle.ts`.

**Interfaces (the rename map; later tasks use these names):**

- **Class:** `Rigidbody` → `RigidBody`.
- **`Vector2` instance methods:**

  | Old | New |
  |---|---|
  | `Invert` | `invert` |
  | `Normalize` | `normalize` |
  | `Length2` | `lengthSquared` |
  | `Length` | `length` |
  | `GetNormal` | `perpendicular` |
  | `Dot` | `dot` |
  | `Cpy` | `copy` |
  | `Add` (in place) | `add` |
  | `Add_Cpy` (returns new) | `plus` |
  | `Sub` (in place) | `subtract` |
  | `Sub_Cpy` (returns new) | `minus` |
  | `Scale` (in place) | `scale` |
  | `Multiply_Cpy` (returns new) | `times` |
  | `ComponentProductUpdate` | `multiplyComponents` |
  | `AddScaledVector` | `addScaled` |
  | `Cross` | `cross` |
  | `Log` | `log` |

- **`Vector2` free functions** (return new vectors): `Add` → `add`, `Sub` → `subtract`, `Scale` → `scale`, `ComponentProduct` → `componentProduct`.
- **Other methods:**
  - `MathHelper.Index` → `MathHelper.wrapIndex`
  - `Simulation.SpawnObject` → `Simulation.spawnObject`
  - `Material.setRestituion` → `Material.setRestitution`
- **Parameters:** every leading underscore is dropped (`_worldSize` → `worldSize`, `_x` → `x`). If dropping it collides with a field name, use `this.` to disambiguate. Don't rename the field.
- **Anything else** the naming rule flags: lowerCamel of the existing name.

- [ ] **Step 1:** Implement the rule `filename-matches-export` in `lint/filenameMatchesExport.js`. It has two checks:
  - If a `.ts` file under `src/` exports exactly one class, the file's basename must equal the class name.
  - Every file under `src/types/` must end in `.types.ts`.

  Register it in `lint/plugin.js` as `local/filename-matches-export` and enable it in `eslint.config.js`.
- [ ] **Step 2:** Enable `@typescript-eslint/naming-convention` with:
  - default: camelCase, `leadingUnderscore: "forbid"`
  - typeLike: PascalCase
  - global `const` variables: camelCase, UPPER_CASE or PascalCase
  - enumMember: PascalCase or UPPER_CASE
  - objectLiteralProperty: `format: null`
  - import: camelCase or PascalCase
- [ ] **Step 3:** Run `npm run lint`. Expected: it FAILS, listing the old filenames and the PascalCase methods.
- [ ] **Step 4:** Do the file renames with `git mv`. For `Staticbody` and `Rigidbody` go through `tmp.ts`. Update the import paths.
- [ ] **Step 5:** Apply the rename map by symbol rename. Review the `Vector2.ts` diff line by line against the map. Each in-place method must keep its `void` body, and each copying method must keep its `return new Vector2(...)` body.
- [ ] **Step 6:** Run `npm run lint && npm run build`. Expected: both exit 0.
- [ ] **Step 7:** Run `git ls-files src | grep -iE "staticbody|rigidbody"`. Expected: exactly `src/RigidBody.ts` and `src/StaticBody.ts`.
- [ ] **Step 8:** Commit as `refactor: enforce naming conventions`.

### Task 4: Import and export rules

**Files:**
- Modify: `engine-typescript/eslint.config.js`, `src/utils/MathHelper.ts`, plus its importers (`CollisionDetection.ts`, `SpatialGrid.ts`, `Shape.ts`, `Polygon.ts`) and the files that use `./sub/...` or `../` (`Simulation.ts`, `StaticBody.ts`, `Controller.ts`)

- [ ] **Step 1:** Configure `no-restricted-imports` with two regex patterns:
  - `^\.\./`, message "use the @/ alias"
  - `^\./.+/`, message "./ is only for same-folder imports; use @/"

  Configure `no-restricted-syntax` on `ExportDefaultDeclaration`, with an override that turns it off for `vite.config.ts`.
- [ ] **Step 2:** Run `npm run lint`. Expected: FAIL in `Simulation.ts` (the `./shapes/...` imports), `StaticBody.ts`, `Controller.ts` and `MathHelper.ts`.
- [ ] **Step 3:** Remove `MathHelper`'s default export. Change its importers to `import { MathHelper } from "@/utils/MathHelper"`. Convert the flagged imports to `@/`.
- [ ] **Step 4:** Run `npm run lint && npm run build`. Expected: both exit 0.
- [ ] **Step 5:** Commit as `refactor: enforce import and export rules`.

### Task 5: No comments

**Files:**
- Create: `engine-typescript/lint/noComments.js`
- Modify: every `.ts` file under `src/`, `vite.config.ts`, and `tsconfig.json` (remove its `/* Bundler mode */` and `/* Linting */` labels)

**Interfaces:**
- Produces: the rule `local/no-comments`, which reports every comment from `context.sourceCode.getAllComments()` with the message "Comments are not allowed; make the code self-explanatory."

- [ ] **Step 1:** Implement `lint/noComments.js`, register it in `plugin.js`, and enable it for all linted files.
- [ ] **Step 2:** Run `npm run lint`. Expected: FAIL with roughly 390 reports.
- [ ] **Step 3:** Remove the comments folder by folder, committing per folder if that's convenient. Where a comment said something the code doesn't, move that meaning into the code. Typical moves:
  - Rename a variable or method.
  - Extract a named constant, for example magic numbers like `25` solver iterations or `40` debug line length.
  - Extract a well-named private method.

  Delete commented-out code and TODO/"Need to implement" markers outright. Stubs keep their empty bodies.
- [ ] **Step 4:** Run `npm run lint && npm run build`. Expected: both exit 0.
- [ ] **Step 5:** Run `git diff --stat HEAD~N -- src` and read the diff for removed lines that weren't comments. Expected: every removed line is a comment, commented-out code, or a line replaced by a renamed or extracted equivalent.
- [ ] **Step 6:** Commit as `refactor: remove comments in favour of self-documenting code`.

### Task 6: TypeScript strict mode

**Files:**
- Modify: `engine-typescript/tsconfig.json` (`"strict": true`), plus whichever files `tsc` flags. Known: `src/particles/Particle.ts` `setVelocity(x, y)` has untyped parameters.

- [ ] **Step 1:** Set `"strict": true`. Run `npm run typecheck` and record the error count.
- [ ] **Step 2:** Fix the errors with type-level changes only:
  - parameter types
  - definite-assignment `!` on fields that are initialised outside the constructor
  - narrower types

  Don't add runtime guards, early returns or `??` defaults.
- [ ] **Step 3:** Run `npm run typecheck && npm run lint && npm run build`. Expected: all exit 0.
- [ ] **Step 4:** Read the diff. Expected: no new `if`, `return`, `??` or `?.` that changes runtime paths.
- [ ] **Step 5:** Commit as `refactor: enable typescript strict mode`.

### Task 7: Architecture layer rule

**Files:**
- Create: `engine-typescript/lint/layers.js`, `engine-typescript/lint/layerMap.js`
- Modify: `engine-typescript/eslint.config.js`

**Interfaces:**
- `layerMap.js` exports three things:
  - `layers`: an ordered list of `{ name, files: string[] }` path globs relative to `src/`
  - `allowedImports`: `{ [layer]: layer[] }`
  - `exceptions`: an array of `{ from: string, to: string }` paths relative to `src/`

  The values are copied from the spec's Architecture section, with the post-rename paths:
  - **math:** `Vector2.ts`, `utils/MathHelper.ts`. Allowed: nothing.
  - **physics:** `RigidBody.ts`, `StaticBody.ts`, `Simulation.ts`, `shapes/**`, `collisionDetectionSystem/**`, `joints/**`, `materials/**`, `particles/**`, `optimizations/**`. Allowed: math, types.
  - **rendering:** `utils/DrawUtils.ts`. Allowed: math, physics, types.
  - **input:** `Controller.ts`. Allowed: types.
  - **app:** `main.ts`. Allowed: everything.
  - **types:** `types/**`. Allowed: types only. Every layer may import types.
  - **exceptions:** `shapes/Shape.ts`, `shapes/Circle.ts`, `shapes/Polygon.ts`, `collisionDetectionSystem/CollisionManifold.ts`, `joints/JointConnection.ts`, `optimizations/grids/SpatialGrid.ts` and `Simulation.ts` may each import `utils/DrawUtils.ts`. `Simulation.ts` may also import `Controller.ts`.
- `layers.js` resolves each import specifier (`@/x` → `src/x`, `./x` → the same directory) to a file. It looks up both layers and reports any import that isn't allowed and isn't in `exceptions`. A file that matches no layer is reported as "unassigned to a layer".
- Add `no-restricted-globals` (`window`, `document`, `requestAnimationFrame`, `navigator`) for the math and physics files.

- [ ] **Step 1:** Implement `layerMap.js` and `layers.js`, then register and enable the rule.
- [ ] **Step 2:** Delete one exception from `layerMap.js` temporarily, for example `Simulation.ts` → `Controller.ts`. Run `npm run lint`. Expected: FAIL naming `Simulation.ts` importing `Controller.ts`.
- [ ] **Step 3:** Restore the exception. Run `npm run lint && npm run build`. Expected: both exit 0.
- [ ] **Step 4:** Shrink the exceptions list to only what lint actually needs. Remove each entry in turn and check whether lint still passes.
- [ ] **Step 5:** Commit as `chore: enforce architecture layers`.

### Task 8: Folder READMEs and sync check

**Files:**
- Create: `engine-typescript/scripts/checkReadmes.mjs`
- Create: a `README.md` in `engine-typescript/scripts/`, `engine-typescript/lint/`, `engine-typescript/public/`, `engine-typescript/src/`, and every folder under `src/`
- Rewrite: `engine-typescript/README.md`
- Delete: `engine-typescript/AGENTS.override.md`
- Modify: `package.json` (`lint` becomes `eslint . && prettier --check . && node scripts/checkReadmes.mjs`)

**Interfaces (the README format the script parses):**
```markdown
# <folder name>

<One line: what the folder is for. Layer: <layer> (where applicable).>

| File | Purpose |
|---|---|
| `FileName.ts` | <one line> |

## Folders

- [`subfolder/`](subfolder/README.md) — <one line>
```

- **File list:** the script builds it with `git ls-files --cached --others --exclude-standard` run inside `engine-typescript/`.
- **Expected entries per folder:** the direct child files, except `README.md` and dotfiles are included, plus the direct child folders.
- **Listed entries:** the first-column code spans in table rows (`` ^\|\s*`([^`]+)` ``), plus the link targets matching `\]\(([^)/]+)/README\.md\)`.
- **Errors:** a missing README, a missing entry or an extra entry each print `<folder>: <problem>`. Exit 1 if any were printed.

- [ ] **Step 1:** Write `checkReadmes.mjs` and add it to `lint`. Run `npm run lint`. Expected: FAIL listing missing READMEs.
- [ ] **Step 2:** Write every folder README with accurate one-line purposes, reading each file. Use the post-rename names and give the layer per the Task 7 map. Rewrite `engine-typescript/README.md` in the same format, covering the top-level files. The false MIT claim and the fake API example go.
- [ ] **Step 3:** Delete `AGENTS.override.md`. Run `npm run lint`. Expected: exit 0.
- [ ] **Step 4:** `touch src/shapes/Planted.ts` then run `npm run lint`. Expected: FAIL with `src/shapes: missing entry Planted.ts`. Delete the planted file, then run lint again. Expected: exit 0.
- [ ] **Step 5:** Commit as `docs: add folder readmes and readme sync check`.

### Task 9: Root docs

**Files:**
- Create: `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`
- Rewrite: `README.md`

- [ ] **Step 1:** Write `AGENTS.md` with the Map and Rules from the spec's "AGENTS.md" section. Keep it under about 40 lines, linking to `README.md` and `CONTRIBUTING.md`.
- [ ] **Step 2:** Write `CLAUDE.md` containing exactly `@AGENTS.md`.
- [ ] **Step 3:** Write `CONTRIBUTING.md` from the spec's "CONTRIBUTING.md" section: branch model, the seven branch types, the commit convention with examples, and the pre-PR checks (`npm run lint`, `npm run typecheck`, `npm run build`).
- [ ] **Step 4:** Rewrite `README.md` per the spec's "Root README.md" section. Keep the existing screenshot `<img>` tags and the Goals list. Copy the layer diagram and the final exceptions list from `lint/layerMap.js`.
- [ ] **Step 5:** Check every relative link in the four files. Each target must exist (`ls` each one).
- [ ] **Step 6:** Commit as `docs: add agents, contributing, and root readme`.

### Task 10: Final verification

- [ ] **Step 1:** In `engine-typescript/`, run `npm ci && npm run lint && npm run typecheck && npm run build`. Expected: all exit 0.
- [ ] **Step 2:** Run `git diff dev --stat -- engine/`. Expected: empty.
- [ ] **Step 3:** Run `grep -rnE "^\s*(//|/\*|\*)" engine-typescript/src`. Expected: no output.
- [ ] **Step 4:** Start `npm run dev`. If a browser tool is available, load the page and confirm the canvas renders with no console errors.
- [ ] **Step 5:** Hand off to the owner for the manual behaviour check from the spec's Verification section. Also ask for OK to push `dev` (two commits ahead of `origin/dev`), and then the docs branch, before opening the PR into `dev`.

## Execution

Recommended: **subagent-driven**, one fresh implementer and one reviewer per task. Tasks 3 to 6 rewrite most files in `src/`, so a silent behaviour change (Review Focus 2 to 4) is the costliest mistake, and a per-task reviewer is the best place to catch it. The alternative is native: I do every task myself, with one whole-branch review at the end.
