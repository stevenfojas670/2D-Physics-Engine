# ECS handoff

Handoff for the ECS implementation (issue #10). Plan: [`2026-11-13-ecs.md`](2026-11-13-ecs.md). Spec: [`../specs/2026-11-13-ecs-design.md`](../specs/2026-11-13-ecs-design.md).

## 1. Where we are

- **Branch:** `feature/ecs`
- **Last task commit:** `refactor: remove the pre-ecs engine and layer exceptions (#10)` (Task 17). This handoff update is part of that commit; see `git log` for the hash.
- **Done:** Tasks 1–17 Step 5. The old engine is deleted and the layer `exceptions` list is empty. The owner said to go ahead with Task 17 before the hand check.
- **Waiting on the owner:**
  - **Task 15 Step 4:** in the worktree `.claude/worktrees/ecs-baseline/engine-typescript`, run `npm run dev -- --port 5174` and open `?scene=benchmark`. After 360 frames, the old engine's update and render ms show on screen and in the console.
  - **Task 16 Step 3:** run `npm run dev` on `feature/ecs` and compare it with the old engine side by side, using the plan's checklist. Then open `?scene=benchmark` and read off update ms, render ms and draw calls.
- **Next:** Task 17 Step 6 (push and open the PR into `dev`), then the final whole-branch review. Step 7 (remove the baseline worktree) waits until the owner has the browser numbers.
- **Checks:** all four green after Task 17, 16 test files, 128 tests. The ECS bench mean after Task 17 is 173.84 ms per step.
- **Headless bench, 2,000 bodies (Node v24.14.1, Vitest 5.1.0, Windows 11):** the old engine takes 844.64 ms per step and the ECS 262.86 ms, about 3.2× faster. Vitest warns that its module export getters add overhead to the ECS hot loops, so the ECS number is pessimistic. The numbers are in `.superpowers/sdd/2026-11-13-ecs/baseline.md`.
- **Throwaway branch:** `test/ecs-baseline-benchmark` (commit `06e5baa`) is local only and is never pushed or merged.

## 2. State of the checks

As of `193d3e1`, `npm run lint`, `npm run typecheck`, `npm run build` and `npm run test` all pass in `engine-typescript/`: 12 test files, 95 tests.

One slip on the way: commit `fecb817` (Task 8) went in with lint failing because of a missing README row. It was fixed in `dd86e33`. The commit helper now runs all four checks and refuses to commit if any fail.

## 3. Interfaces as built (only where they differ from the plan)

- **Views:** callbacks get the **slots first and the entity last**: `view.each((transformSlot, velocitySlot, entity) => …)`. `find(predicate)` uses the same order. Supported arity is 1–6 included components.
- **`System` is `(deltaTime: number) => void`.** Factories `createXSystem(world)` capture their world, and `Schedule.run(world, deltaTime)` calls each system with `deltaTime`, then `world.flushDeferred()`.
- **`World`** also has `get entityCapacity(): number` (the highest entity index issued + 1), used to size index-keyed arrays.
- **Resources** are keys named `<Name>Resource`:
  - `GravityResource` (with `DEFAULT_GRAVITY = { x: 0, y: 200 }`) in `resources/Gravity.ts`;
  - `WorldSizeResource` in `resources/WorldSize.ts`;
  - `CollisionSettingsResource` with the class `CollisionSettings` in `resources/CollisionSettings.ts`. Its methods are `canCollide(groupA: number, groupB: number)`, `enableCollision(a, b)`, `disableCollision(a, b)`, `setGroupName(group, name)` and `groupName(group)`.
  - `ContactsResource` with the class `ContactLog` in `resources/ContactLog.ts`. Its members are `clear`, `recordContact`, `recordFriction`, `contactCount`, `frictionCount`, and the flat `contacts` (stride 5) and `frictionArrows` (stride 4) arrays.
  - `MouseDragResource` with `createMouseDrag()` in `resources/MouseDrag.ts`;
  - `BroadPhaseResource` in `resources/BroadPhase.ts`.
- **Collider:**
  - `COLLIDER_SCHEMA`, `ColliderSchema`, `ColliderColumns`, `transformCollider`, `computeNormals`, `translateCollider`, `isPointInsideCollider` and `aabbOverlap` are in `shapes/colliderGeometry.ts`.
  - `ColliderKind`, `ColliderShape` (with an optional `rectangle: { width, height }`), the `create*Shape` functions, the inertia functions, `shapeInertia(shape, mass)` and `colliderValues(shape)` are in `shapes/colliderShapes.ts`.
- **Factories** in `components/bodyFactories.ts`:
  - `spawnRigidBody(world, shape, x, y, mass, { group?, color? })`;
  - `spawnStaticBody(world, shape, x, y, options?)`;
  - `spawnParticle(world, x, y, mass, { damping?, accelerationX?, accelerationY? })`.
- **Narrow phase:** `Contact` (with `set(depth, nx, ny, px, py)`) is in `collisionDetectionSystem/Contact.ts`. `testCollision(colliders, slotA, slotB, centerAX, centerAY, centerBX, centerBY, out): boolean` is in `narrowPhase.ts`. The normal points from A to B.
- **Contact resolution:** the class `BodyColumns(world)` is in `collisionDetectionSystem/BodyColumns.ts`, with `transforms`, `velocities`, `masses`, `materials` and `colliders` stores. `correctPositions(bodies, a, b, contact)` and `resolveImpulse(bodies, a, b, contact, friction: ContactLog | null)` are in `contactResolution.ts`.
- **Broad phase:** `BroadPhaseGrid` is an **abstract class**, not an interface, in `optimizations/broadPhase/BroadPhaseGrid.ts`. It has `resize`, `insert`, `entitiesInCell`, `cellAt`, `cellsOf`, `clear` and an optional `forEachCellRect`. `HashGrid`, `SpatialGrid` and `createBroadPhaseGrid(kind, cellSize)` sit beside it.
- **Candidate pairs:** the class `CandidatePairs` (`count`, `entityA(pair)`, `entityB(pair)`, `clear`, `push`) and `CandidatePairsResource` are in `resources/CandidatePairs.ts`, not `BroadPhaseSystem.ts` (one-class-per-file rule). `createBroadPhaseSystem(world)` sets that resource when it is built. It needs `BroadPhaseResource` and `CollisionSettingsResource` set before it runs; the solver needs `ContactsResource`. Only entities with both `Collider` and `CollisionGroup` (and no `Particle`) enter the grid.
- **Systems** live in `src/systems/`: `createIntentForceSystem`, `createGravitySystem`, `createJointForceSystem`, `createBroadPhaseSystem`, `createCollisionSolverSystem`, `createRigidBodyIntegrationSystem`, `createParticleIntegrationSystem` and `createColliderTransformSystem`.
- **Rendering** in `src/rendering/`:
  - `DrawBatches` with `line`, `rect`, `arrow`, `fillCircle`, `strokeCircle`, `clear` and `flush(ctx: BatchCanvas): number`. `BatchCanvas` is a `Pick` of `CanvasRenderingContext2D`, so tests pass a fake.
  - `RenderContextResource` (`{ ctx, batches, drawCalls }`) and `DebugOptionsResource` with `createDebugOptions()`.
  - `createColliderRenderSystem`, `createJointRenderSystem`, `createDebugDrawSystem` and `createDrawFlushSystem`. The debug system draws friction and contacts only if `ContactsResource` is set, the mouse drag only if `MouseDragResource` is set, and grid cells only if `BroadPhaseResource` is set.
- **App** in `src/app/`:
  - `installWorldResources(world, width, height)` sets the `WorldSize`, `Gravity`, `CollisionSettings`, `BroadPhase` (hash, 20), `Contacts` and `MouseDrag` resources. `spawnWalls(world, width, height)` returns `[top, bottom, left, right]`. Both are in `DemoScene.ts` beside `buildDemoScene`, `resizeDemoWorld`, `spawnDemoObject` and `buildStressTestPyramid`.
  - `main.ts` must also set `ControllerKeysResource` and `MouseInputResource` (with `createMouseInput()`), plus `RenderContextResource` and `DebugOptionsResource` for rendering.
  - `buildBenchmarkScene(world, bodyCount = 2000)` exports `BENCHMARK_WIDTH` (1600) and `BENCHMARK_HEIGHT` (1000).
  - **Vitest 5 benchmarks:** there is no top-level `bench`. The benchmark is a `test` that uses the `bench` fixture: `await bench(name, fn).run({ time })`. `npm run bench` uses `--reporter=verbose` so the table prints. The baseline branch (Task 15) needs the same shape.
- **Joint helpers** in `joints/jointForces.ts`: `StretchState`, `anchorWorldPosition(transformColumns, slot, localX, localY, out)` and `addForceAtPoint(transformStore, forceStore, entity, pointX, pointY, forceX, forceY)`. `addForceAtPoint` takes the two stores, not `BodyColumns`, and does nothing if the entity lacks either. A joint body with no `Mass` counts as immovable for the force-halving rule.

## 4. Deviations and decisions

All of these are also in the ledger (`.superpowers/sdd/2026-11-13-ecs/progress.md`, git-ignored).

- **PR #11 was merged,** so `dev` was merged into `feature/ecs` first (`bfdde62`).
- **Vitest 5.1.0** (works with Vite 8.0.8). The `vite.config.ts` `defineConfig` now comes from `vitest/config`.
- **Slots-first callbacks and the deltaTime-only `System`:** `noUnusedParameters` is on, and lint forbids `_`-prefixed names, so an ignored leading parameter does not compile. The spec has an execution note in its Views section.
- **One class per file** (lint rule): `Contact`, `BodyColumns` and `BroadPhaseGrid` each have their own file.
- **`COLLIDER_SCHEMA` is a shared const value.** Rectangles carry their size, so `shapeInertia` takes no extra option.
- **Plan arithmetic fix:** in the Task 7 circle-on-box-top test, the depth is 6, not 4.
- **`addForceAtPoint` (Task 11):** the pre-flight ruled that it takes the Transform and ForceAccumulator stores directly, because `BodyColumns` has no force store.
- **Broad-phase dedup stamp (Task 12):** the plan's stamp (A's index + 1) survives across steps, so the next step would skip every pair. The stamp is a running counter instead; a test pins pairs being found on the next step.
- **Contacts and friction arrows are recorded on the first solver iteration (Task 12),** not the last. By the 25th iteration, the 90% positional correction has pushed resting bodies to exactly touching, so strict AABB overlap fails and nothing would be recorded. Arrows then would almost never show.
- **Task 17 layer map:** `resources/**` stays in the physics layer (the spec's table omits it, but the folder exists), and the rendering layer is just `rendering/**` because `utils/DrawUtils.ts` is deleted.
- **Task 17 before the hand check:** the owner told me to continue, so the old engine was deleted before the browser parity check. The PR says the check is still open.
- **Task 13** builds its 2,000-body test scene with `spawnRigidBody` in a loop, because `buildBenchmarkScene` arrives in Task 14.

## 5. Open flags for the PR

- **Generics in the core:** the column-mapping types in `defineComponent.ts` go beyond the single "view tuple" generic the spec allowed.
- **Callback order:** slots first, entity last, differing from the spec's original `(entity, …slots)`.
- **Inherited `ForceJoint` quirk:** it applies A's force at B's anchor. Port it as is, don't fix it (Task 11).
- **The static rectangle now collides.** Batched drawing may change the draw order (Tasks 13 and 16).

## 6. Gotchas

- **Windows and line endings:** repo files are CRLF in the working copy. Node or `sed` replacements that match on `\n` silently miss. Prefer the Edit tool, or normalise `\r\n` first.
- **Shell quoting:** don't put text containing apostrophes inside a single-quoted `node -e '…'` script; write a file instead.
- **Prettier scope:** run `npx prettier --write` only on the files you changed. Running it over `../superpowers` reformats unrelated older docs.
- **Columns:** systems capture `world.store(X).columns` once. That object is stable, and its arrays are replaced inside it on growth, so always index through it and never cache `columns.x` itself.
- **Tests and `noUnusedParameters`:** tests are type-checked with it on. A view callback that only needs the entity must still use the slot parameters, or use `find((...values) => …)`.
- **Old engine:** deleted in Task 17. It survives on `dev` and in the baseline worktree for comparison.
- **Untracked `.claude/`:** it sits at the repo root and holds worktrees. Don't commit it.

## 7. Resume prompt

> Continue the ECS implementation on branch `feature/ecs` in `C:\Users\Bing\Documents\GitHub\2D-Physics-Engine`. Read `AGENTS.md`, the spec `superpowers/specs/2026-11-13-ecs-design.md`, the plan `superpowers/plans/2026-11-13-ecs.md` (including its "Rulings made during execution" section) and the handoff `superpowers/plans/2026-11-13-ecs-handoff.md`. Run `npm run lint`, `npm run typecheck`, `npm run build` and `npm run test` in `engine-typescript/` to confirm a green start. Then use superpowers:executing-plans to carry out Task 11 onward, starting at the first unticked checkbox. Tag every commit subject with `(#10)`, tick plan checkboxes as steps finish, and update this handoff's "Where we are" section after each task.
