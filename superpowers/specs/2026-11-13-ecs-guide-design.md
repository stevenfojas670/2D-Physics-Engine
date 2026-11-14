# ECS guide and sandbox scene: design

Issue: #15. Branch: `feature/ecs-guide` from `dev`, with one pull request back into `dev` covering the code and the docs; the owner decided this. It is a `feature/` branch because Part 1 adds engine code. Code commits use `feat:` and guide commits use `docs:`, and all of them end with `(#15)`.

## Intent

The ECS replaced the object-per-body engine in PR #12. `src/ecs/README.md` explains how the core works inside, but nothing explains how to build with it. The conventions live only in the code and in `superpowers/plans/`.

There are two readers, and each gets their own document:

1. **Agents and contributors** adding to the engine. They need the rules and how to apply them, fast, next to the code. This is what issue #15 asks for.
2. **The owner**, who wants personal notes in Obsidian to understand the ECS well enough to program against it by hand. The long-term goal is writing their own scenes and games on this ECS. The owner already knows entities and components from building ZECS, their own C++ sparse-set ECS, kept outside this repo. Systems, schedules and setting up a `World` for a scene are new to them.

Both documents teach from the same real code: a new runnable **sandbox scene** with a wind force written from scratch.

## Goals

- A repo guide that an agent can read once and then add a component, system, resource or scene that follows the engine's conventions.
- Obsidian notes the owner can learn from and program from by hand, focused on what is new to them.
- A runnable sandbox scene (`?scene=sandbox`) that works as the worked example for both, kept accurate by typecheck and tests.

## Non-goals

- Physics internals: broad phase, narrow phase, solver, integration. The notes only show the order the systems run in and what each one reads and writes. Detailed physics notes are a separate, later issue.
- Changes to the ECS core (`src/ecs/`).
- The `Game Engine/` folder in the vault, ZECS included. Leave both untouched.

## Anti-goals

- A repo guide that repeats `src/ecs/README.md`'s internals. It links to them instead.
- Obsidian notes that are just the repo guide copied over. Those would lose the ZECS comparison and the "why".
- Examples in either document that don't match the code. Every snippet comes from, or is checked against, real files.

## Approaches

1. **One repo guide plus separate Obsidian notes (chosen).** A single page, `engine-typescript/docs/ecs-guide.md`, for agents. Separately written, linked notes in the vault for the owner. Both use the sandbox scene. Trade-off: two texts to keep current, each written for its reader.
2. **Repo guide split into the same notes as Obsidian.** Rejected. It's easier to pair notes with pages, but agents would have to read several files, and it pushes both texts to read alike.
3. **Write once and copy it into the vault.** Rejected. Nothing drifts, but the owner loses the ZECS comparison and the explanation of why.

The owner picked approach 1.

## Part 1: sandbox scene and wind (code)

Small, real code that the guide and the notes walk through. It follows every repo rule: no comments, layer boundaries, a README entry per file.

| File | Layer | What it is |
| --- | --- | --- |
| `src/resources/Wind.ts` | physics | `WindResource = defineResource<Wind>("Wind")`, with `Wind { x, y }` in force per unit of exposure, and `DEFAULT_WIND = { x: 0, y: 0 }` |
| `src/components/WindExposure.ts` | physics | `WindExposure = defineComponent("WindExposure", { exposure: "f64" })`. How strongly wind pushes this body |
| `src/systems/WindSystem.ts` | physics | `createWindSystem(world)`. Captures `world.store(ForceAccumulator).columns` and `world.store(WindExposure).columns` once, builds `world.view([ForceAccumulator, WindExposure])` once, and each step reads `WindResource` and adds `wind × exposure` to the force |
| `src/app/SandboxScene.ts` | app | `SANDBOX_WIDTH`, `SANDBOX_HEIGHT`, `buildSandboxScene(world)` and `createSandboxRespawnSystem(world)` |

**Shared schedule (my call).** Wind becomes a general engine feature rather than a sandbox-only one:

- `installWorldResources` in `DemoScene.ts` also sets `WindResource` to `DEFAULT_WIND`. With zero wind and no `WindExposure` entities, the demo and benchmark behave exactly as before.
- `createUpdateSchedule` adds `createWindSystem` straight after `createGravitySystem`, because both are forces that must run before integration.

**Scene (my calls on the details):**

- The world has a fixed size of 1200 × 700, set the way the benchmark sets its size: the canvas is set to that size, and resizing has no effect.
- Static bodies: a floor and a ceiling, and no side walls, so wind can carry bodies off the right edge.
- A dozen mixed circles and boxes, mass 1, each with `WindExposure`. Their exposures vary so their different speeds are visible.
- Steady wind to the right, strong enough to push bodies across the screen in a few seconds.
- Mouse drag works, because the shared schedule includes it. There is no player body.

**Respawn system: the deferred-command example.** `createSandboxRespawnSystem(world)` walks `world.view([Transform, WindExposure])`. When a body's `x` passes `SANDBOX_WIDTH + margin`, it calls `world.defer(...)` with a command that destroys that body and spawns a replacement at the left edge with the same exposure. Spawning inside `each` would add to the stores the view is walking, which is exactly the case `defer` exists for. `main.ts` appends it to the end of the update schedule (`createUpdateSchedule(world).add(...)`) only for the sandbox scene, so it runs after the solver.

**`main.ts`:** read `scene` once. `"benchmark"` and `"sandbox"` each build their scene and fix the canvas size; anything else builds the demo. The window resize handler stays demo-only.

**Tests:**

- `tests/systems/wind.test.ts`: wind adds `wind × exposure` to bodies that have `WindExposure`, and bodies without it get no force.
- `tests/app/app.test.ts`: the sandbox scene builds the expected bodies. A body moved past the right edge is replaced after one schedule run: the old ID is dead, and the number of wind bodies is unchanged.
- The existing demo and benchmark tests must still pass unchanged. That is the check that the default wind changes nothing.

**Docs that change with the code:**

- READMEs for `src/app/`, `src/components/`, `src/resources/`, `src/systems/`, `tests/systems/` and `tests/app/`, if their tables list tests.
- The Scenes table in `engine-typescript/README.md`: address `/?scene=sandbox`, what it shows, and the controls (left-drag pulls any body; resizing has no effect).

## Part 2: repo guide (`engine-typescript/docs/ecs-guide.md`)

A new `engine-typescript/docs/` folder with a `README.md` listing `ecs-guide.md`, so the lint check passes. It is linked from:

- the `AGENTS.md` Map, with a line saying to read it before adding components, systems, resources or scenes
- the root `README.md`
- `engine-typescript/README.md`, in its Folders list
- `src/ecs/README.md`

**Reader:** an agent that is about to change the engine. The guide states rules first, each with a short example from real code. It doesn't re-explain internals; it links to `src/ecs/README.md` for those.

**Sections, from issue #15:**

1. **Entities:** `createEntity`, `destroyEntity`, `isAlive`, stale IDs, and `World.add` throwing for a dead entity.
2. **Components:** `defineComponent` and schema types (`f64` … `u8`, `ref<T>()`, tags); `add` with partial values, `has`, `remove`. Rule: a slot is never kept across a structural change.
3. **Reading data:** capture `world.store(X).columns` once and read `columns.field[slot]` every step. Never capture `columns.field` itself, because the store replaces the arrays when it grows.
4. **Body factories:** `spawnRigidBody`, `spawnStaticBody` and `spawnParticle`, as a table of the components and defaults each adds.
5. **Views:** `world.view([...], { without: [...] })`; slots-first callbacks `(slotA, slotB, …, entity)`; leave off trailing parameters you don't need; build the callback once, outside the step; `find`, `contains`, `slot`.
6. **Resources:** `defineResource<T>(name)`, `setResource`, `resource` (throws if missing), `hasResource`, and the `<Name>Resource` naming. Read resources inside the step, not in the factory.
7. **Systems and schedules:** the `createXSystem(world): System` factory shape; the update and render schedules in `app/schedules.ts`; the current order with one line on why each position matters; which layer a new system belongs in (physics `systems/`, `rendering/` or `app/`).
8. **Deferred commands:** what is safe inside `each` (changing fields; destroying the *current* entity) and what must be deferred (adding or removing components on other entities, spawning). When deferred commands run: after each system, including commands queued while flushing.
9. **Worked example:** wind, following the four files from Part 1 in order, and then adding the system to the schedule.
10. **Adding a scene:** a builder in `src/app/`, a `scene` value in `main.ts`, any scene-only systems appended to the schedule, a test in `tests/app/`, and a Scenes table row (AGENTS.md rule 4).

Snippets are excerpts of the sandbox and wind files, or of existing systems (`GravitySystem.ts`, `CollisionSolverSystem.ts`, `MouseDragSystem.ts`). They follow the repo's code rules (no comments).

## Part 3: Obsidian notes

These live in the ECS folder of the owner's personal Obsidian vault. They are not in the repo, and the vault's location is deliberately left out of it; the owner supplies the path when the notes are written. The style is Obsidian-native: `[[wikilinks]]` between notes, Mermaid diagrams where a picture helps, and TypeScript code blocks.

Every note ends with a **Source** section linking to the repo files and tests it describes, as GitHub links on `dev` (my call). After an ECS change, those links show which notes to recheck.

| Note | Covers | Depth |
| --- | --- | --- |
| `ECS Index.md` | What the ECS is in this engine, a reading order and links to every note | Short |
| `From ZECS to this ECS.md` | Side by side with ZECS: handle layout (20/12 bits vs 16/16), whole `T` objects vs one array per field, `Get` returning `T*` vs slots and `columns.field[slot]`, `ISystem` classes vs factory functions, run order by system ID vs an explicit schedule, and the `World` your sandbox `World.h` says it needs | Medium; replaces explaining entities and components from scratch |
| `World.md` | What the world owns (registry, stores created lazily, resources, deferred queue), each method, and why scenes and systems take the world as a parameter instead of using globals | Deep |
| `Views.md` | Querying with `with` and `without`, the slots-first callback, why the smallest store drives the loop, why it walks backwards, `find`, `contains`, `slot` | Medium |
| `Systems and Schedules.md` | The factory pattern step by step: capture columns, build views and callbacks once, return the step. Why the order is explicit, the full update and render order as a Mermaid diagram with what each system reads and writes, and how a frame in `main.ts` runs both schedules | Deep |
| `Resources.md` | What a resource is, when to use one rather than a component, naming, the resources the engine installs and who installs them (`main.ts` or the scene) | Medium |
| `Deferred Commands.md` | Why spawning or removing inside `each` breaks a view, what `defer` queues, when the flush runs, with the sandbox respawn system as the example | Medium |
| `Building the Sandbox Scene.md` | A walkthrough from an empty file to `?scene=sandbox`: resources, spawning bodies, the wind component, resource and system, adding them to the schedule, the respawn system, wiring in `main.ts`, running it. Ends with "make your own scene" exercises: change the wind, add a gust system, add a new component | Deep; the main hands-on note |

The core of the "how a frame runs" overview chosen in brainstorming goes in `Systems and Schedules.md` rather than a separate note (my call), because the order only makes sense next to the schedule.

## Order of work

1. Part 1, test first, with all four checks passing (`lint`, `typecheck`, `build`, `test`).
2. Part 2, using the real code from Part 1.
3. Part 3, written last so it can use the final code and the guide.
4. Commits in Conventional Commits style ending with `(#15)`. Open one pull request into `dev`.

## Left to the builder

- Exact sandbox numbers: body count, sizes, wind strength, exposures, respawn margin, colours. Pick what looks clear in the browser.
- Exact wording and order inside each section or note.
- Which existing system snippets illustrate a rule, as long as they're real.
- Whether a Mermaid diagram helps in `World.md` and `Views.md`.
