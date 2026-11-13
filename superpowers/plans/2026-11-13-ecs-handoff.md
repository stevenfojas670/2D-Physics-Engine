# ECS handoff

Handoff for the ECS implementation (issue #10). Plan: [`2026-11-13-ecs.md`](2026-11-13-ecs.md). Spec: [`../specs/2026-11-13-ecs-design.md`](../specs/2026-11-13-ecs-design.md).

## 1. Where we are

- **Branch:** `feature/ecs`
- **Last task commit:** `193d3e1 feat: add force and integration systems (#10)`. This handoff file is committed after it.
- **Done:** Tasks 1–10. The ECS core, geometry, components, resources, factories, narrow phase, contact resolution, broad-phase grids, and the force, integration and collider-transform systems are built.
- **Next:** Task 11 (joints), then Tasks 12–17.
- **The demo still runs on the old engine.** `main.ts` is untouched until Task 16.

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
- **Systems** live in `src/systems/`: `createIntentForceSystem`, `createGravitySystem`, `createRigidBodyIntegrationSystem`, `createParticleIntegrationSystem` and `createColliderTransformSystem`.

## 4. Deviations and decisions

All of these are also in the ledger (`.superpowers/sdd/2026-11-13-ecs/progress.md`, git-ignored).

- **PR #11 was merged,** so `dev` was merged into `feature/ecs` first (`bfdde62`).
- **Vitest 5.1.0** (works with Vite 8.0.8). The `vite.config.ts` `defineConfig` now comes from `vitest/config`.
- **Slots-first callbacks and the deltaTime-only `System`:** `noUnusedParameters` is on, and lint forbids `_`-prefixed names, so an ignored leading parameter does not compile. The spec has an execution note in its Views section.
- **One class per file** (lint rule): `Contact`, `BodyColumns` and `BroadPhaseGrid` each have their own file.
- **`COLLIDER_SCHEMA` is a shared const value.** Rectangles carry their size, so `shapeInertia` takes no extra option.
- **Plan arithmetic fix:** in the Task 7 circle-on-box-top test, the depth is 6, not 4.
- **`addForceAtPoint` (Task 11):** the pre-flight ruled that it takes the Transform and ForceAccumulator stores directly, because `BodyColumns` has no force store.
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
- **Untouched until Task 17:** the old engine files (`RigidBody.ts`, `Simulation.ts`, `shapes/Shape.ts` and the rest).
- **Untracked `.claude/`:** it sits at the repo root and holds worktrees. Don't commit it.

## 7. Resume prompt

> Continue the ECS implementation on branch `feature/ecs` in `C:\Users\Bing\Documents\GitHub\2D-Physics-Engine`. Read `AGENTS.md`, the spec `superpowers/specs/2026-11-13-ecs-design.md`, the plan `superpowers/plans/2026-11-13-ecs.md` (including its "Rulings made during execution" section) and the handoff `superpowers/plans/2026-11-13-ecs-handoff.md`. Run `npm run lint`, `npm run typecheck`, `npm run build` and `npm run test` in `engine-typescript/` to confirm a green start. Then use superpowers:executing-plans to carry out Task 11 onward, starting at the first unticked checkbox. Tag every commit subject with `(#10)`, tick plan checkboxes as steps finish, and update this handoff's "Where we are" section after each task.
