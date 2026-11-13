# 2D Physics Engine

A 2D rigid-body physics engine, restructured along the lines of Ian Millington's *Game Physics Engine Development*. It includes:

* Collision detection for circles and convex polygons, with a broad phase on hash or spatial grids
* Shapes: circle, rectangle and polygon
* Rigid bodies with forces, torque, impulses, friction and several integrators
* Joints: spring and force
* Collision groups and a collision matrix
* 2D vector math utilities

<img width="2184" height="1203" alt="image" src="https://github.com/user-attachments/assets/ea947797-e911-45e8-acfb-074645b2452d" />

<img width="2203" height="1212" alt="image" src="https://github.com/user-attachments/assets/5ed6fbd6-7e5d-44da-9e76-ecaa7c9fafac" />

<img width="2177" height="1211" alt="image" src="https://github.com/user-attachments/assets/d093dcd5-6dc2-4060-940b-ea44cccde1e3" />

<img width="2183" height="1209" alt="image" src="https://github.com/user-attachments/assets/d2465728-d0d2-4c7c-afd2-0a8fce5f50b5" />

<img width="2184" height="1210" alt="image" src="https://github.com/user-attachments/assets/4aea75f2-2050-4b08-9326-5c57eeb4b6d6" />

## Two engines

| Folder | What it is |
|---|---|
| [`engine-typescript/`](engine-typescript/README.md) | The active engine: TypeScript, built with Vite. All documentation, lint and tooling live here. |
| `engine/` | The original vanilla JavaScript engine. Kept as a playground for manual programming; it has no docs or lint by design. |

## Getting started

```sh
cd engine-typescript
npm install
npm run dev
```

| Script | What it does |
|---|---|
| `npm run dev` | Starts the dev server with the demo scene |
| `npm run build` | Type checks, then builds into `dist/` |
| `npm run preview` | Serves the built `dist/` |
| `npm run lint` | ESLint, Prettier check and the folder README check |
| `npm run format` | Rewrites files with Prettier |
| `npm run typecheck` | Type checks without building |
| `npm run test` | Runs the Vitest tests in `tests/` |
| `npm run bench` | Runs the Vitest benchmarks in `tests/` |

The legacy engine still runs by opening `engine/index.html` with the VS Code Live Server extension.

<img width="743" height="145" alt="image" src="https://github.com/user-attachments/assets/55c7620b-5986-4a1f-a8d5-bb1bb902e574" />

## Code rules

These apply to `engine-typescript/` and are enforced by `npm run lint`. Inline `eslint-disable` comments are turned off, so there is no way to opt out of a rule from inside a file.

1. **No comments.** Code explains itself through names and structure. Pull a meaning that needs explaining into a named constant, variable or function.
2. **Formatting** is Prettier's: tabs, double quotes, no semicolons.
3. **Naming:**
   * Classes and types are PascalCase.
   * Methods, functions, variables and parameters are camelCase, with no leading underscores.
   * Global constants and `static readonly` class properties may be UPPER_CASE.
   * A file that exports one class is named after it.
   * Files in `src/types/` end in `.types.ts`.
4. **Imports:** use the `@/` alias (which points at `src/`) across folders. `./` is only for files in the same folder, and `../` is not allowed.
5. **Exports** are named. `export default` is allowed only in `vite.config.ts` and `eslint.config.js`, because those tools require it.
6. **TypeScript** runs in `strict` mode with unused locals and parameters reported.
7. **Folder READMEs** must list every file and subfolder in their folder (see below).
8. **Architecture layers** (below) must be respected.

## Architecture

Every file in `engine-typescript/src/` belongs to one layer. A layer may import from its own layer and from the layers listed for it. The map lives in [`engine-typescript/lint/layerMap.js`](engine-typescript/lint/layerMap.js).

```
ecs         ecs/                                        → ecs, types
math        Vector2.ts, utils/MathHelper.ts            → math, types
physics     RigidBody, StaticBody, Simulation,          → ecs, math, types
            shapes/, collisionDetectionSystem/,
            joints/, materials/, particles/,
            optimizations/
rendering   utils/DrawUtils.ts                          → physics, ecs, math, types
input       Controller.ts                               → types
app         main.ts                                     → everything
types       types/                                      → types; every layer may import types
```

The ecs, math and physics layers may not use browser globals (`window`, `document`, `requestAnimationFrame`, `navigator`).

### Known exceptions

Physics code currently draws itself to the canvas, and `Simulation` reads keyboard input directly. Until that is moved into the rendering and app layers, these imports are allowed:

| File | Allowed to import |
|---|---|
| `shapes/Shape.ts` | `utils/DrawUtils.ts` |
| `shapes/Circle.ts` | `utils/DrawUtils.ts` |
| `shapes/Polygon.ts` | `utils/DrawUtils.ts` |
| `collisionDetectionSystem/CollisionManifold.ts` | `utils/DrawUtils.ts` |
| `joints/JointConnection.ts` | `utils/DrawUtils.ts` |
| `optimizations/grids/SpatialGrid.ts` | `utils/DrawUtils.ts` |
| `Simulation.ts` | `utils/DrawUtils.ts`, `Controller.ts` |

Removing these is the goal of the next refactor. The list should only shrink.

## Repo layout

| Path | Contents |
|---|---|
| [`.github/`](.github/pull_request_template.md) | Pull request template and issue templates (bug report, feature request) |
| [`AGENTS.md`](AGENTS.md) | Rules for AI agents working in this repo |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Branches, commits and pull requests |
| [`engine-typescript/`](engine-typescript/README.md) | The active engine; every folder has a README mapping its files |
| `engine/` | The legacy JavaScript engine |
| [`superpowers/`](superpowers/README.md) | Design specs and implementation plans |

## Goals

* Following Game Physics Engine Development by Ian Millington, restructure the engine to be more professional.
* Implement a management plane for user customization
* Implement a particle system.
* Implement buoyancy.
* Implement ragdolls.
* Implement more advanced springs.
* Implement fractures.
* Development an Entity-Component-System.
* Port to Typescript and C++
* 3D Implementation
