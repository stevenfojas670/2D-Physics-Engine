# Physics performance phase 1: cached contacts and split-impulse solver — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Tick each box as its step finishes and commit the ticks with the task.

**Goal:** Replace the 25-pass narrow-phase-per-iteration solver with a narrow phase that runs once per step, stored two-point manifolds, a warm-started sequential-impulse velocity solve and a split-impulse pseudo-velocity solve, in a split integration order, so the 2,000-body benchmark update drops from 47.5 ms to under 16.7 ms.

**Architecture:** `contactDetection` builds manifolds once per step into a `ContactManifolds` resource (flat typed arrays, entity pair + feature-ID warm-start cache). `velocitySolve` and `pseudoVelocitySolve` iterate over those manifolds only, with the maths in `src/collisionDetectionSystem/sequentialImpulse.ts`. `RigidBodyIntegrationSystem` splits into `velocityIntegration` (before collision) and `positionIntegration` (after the solves, adding pseudo-velocity), and `colliderTransform` moves to the end of the step. The app gets a fixed-step accumulator.

**Tech Stack:** TypeScript, the project ECS (`src/ecs/`), Vitest, Vite.

**Spec:** `superpowers/specs/2026-11-13-physics-performance-design.md`, Phase 1 (steps 1–11, Target, Risk table, Testing, Docs to update). Read it alongside this plan.

## Global Constraints

- No comments anywhere; lint rejects them (AGENTS.md rule 1).
- `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test` in `engine-typescript/` all pass at the end of every task.
- Every added, removed, renamed or changed file updates its folder `README.md` row in the same commit (`| File | Purpose |` table, backticked names, alphabetical). New test files need rows in their `tests/<folder>/README.md`.
- Physics layer (`components`, `resources`, `systems`, `shapes`, `collisionDetectionSystem`, …) imports only physics, ecs, math, types; no browser globals. The fixed-step accumulator lives in `src/app/`. Never touch `lint/layerMap.js` exceptions.
- Imports use `@/…`; `./` only within the same folder; no `../`.
- Commits: Conventional Commits, subject ends with `(#22)`, e.g. `feat: add contact manifolds resource (#22)`, plus the session attribution trailer.
- Branch: `feature/contact-solver` (exists, has the settled spec).
- Spec values: `velocityIterations` 8, `pseudoVelocityIterations` 3, `beta` 0.2, `slop` 0.5 px, restitution `max(a, b)`, friction `√(a·b)`, fixed step 1/60 s, max 2 points per manifold, tangent `t = (n.y, −n.x)`.
- `ComponentStore.columns` arrays are replaced on growth: capture the `columns` object, never `columns.x`.

## Review Focus

1. **`touching` drawn as always 0.** `ColliderTransformSystem` resets `touching`, and it now runs after detection, so the red bounding boxes would vanish. Detection owns the reset now (Task 7) and a full-schedule test checks it (Task 8).
2. **Warm start applied to a recycled entity.** A destroyed body's entity index is reused with a new generation; the new body must start with zero accumulated impulse (Task 7 test).
3. **Frame hitches.** A 5 s frame (tab switch) must run at most `maxStepsPerFrame` steps and drop the rest, not spiral (Task 3 test).
4. **Degenerate pairs.** Two static bodies overlapping, or a pair whose effective-mass denominator is 0, produce no manifold and no NaN (Task 7 test).
5. **Body without `Material`.** Combine with the defaults from `src/materials/materialDefaults.ts` instead of reading slot −1 (Task 7 test).

Known and out of scope (unchanged from `dev`): a circle whose centre is inside a polygon gets no contact; `circleVsPolygonEdges` keeps the last qualifying edge.

---

### Task 1: Save the plan

**Files:** Create `superpowers/plans/2026-11-14-physics-performance-phase-1.md` (this document).

- [x] **Step 1:** Copy this plan to the path above.
- [x] **Step 2:** In the spec, set Phase 1's Status to `planned. Plan: superpowers/plans/2026-11-14-physics-performance-phase-1.md. Issue #22. Branch: feature/contact-solver.`
- [x] **Step 3:** Commit `docs: add phase 1 plan (#22)`.

### Task 2: Stability regression tests against today's solver

These pin "at least as stable as `dev`" before anything changes. They must pass on the current solver.

**Files:** Create `tests/systems/stability.test.ts`, `tests/systems/physicsWorld.ts` (shared helpers); modify `tests/systems/README.md`.

**Interfaces — Produces** (`tests/systems/physicsWorld.ts`):
- `physicsWorld(gravityX: number, gravityY: number): World` — installs Gravity, Wind `{0,0}`, CollisionSettings, BroadPhase `createBroadPhaseGrid("hash", 20)` sized 2000×2000, ContactLog, MouseDrag, ControllerKeys/MouseInput as `tests/benchmark/physicsStep.bench.ts` does.
- `stepWorld(world: World, steps: number, onStep?: (step: number) => void): void` — builds `createUpdateSchedule(world)` once, runs it at `1/60`.
- `positionOf(world, entity): [number, number]`, `velocityOf(world, entity): [number, number, number]`.

- [x] **Step 1: Write the tests** (all use `stepWorld`, gravity `(0, 200)` unless stated):
  - `resting box stays on the floor`: floor `createRectangleShape(400, 20)` static at (0, 100); 20×20 box mass 1 at (0, 40); 300 steps. Over steps 240–299 y spread `< 0.5`; final y in `(75, 81)`; `|vy| < 1`.
  - `ten-box stack stays standing`: floor as above at (0, 300); floor top is y 290; boxes 20×20 mass 1 at x 0, y `290 − 10 − 20.1·i` for i 0..9 (0.1 px gaps); 600 steps. Top box `|x| < STACK_DRIFT` and `|y − 100| < STACK_SINK` (100 = resting centre of box 9).
  - `small pyramid settles`: `buildBenchmarkScene(world, 210)` (it installs its own resources; add ControllerKeys/MouseInput); 600 steps. Mean speed over all `Velocity` bodies in the last step `< PYRAMID_SPEED`; every body's y `< 1000` (inside the walls).
  - `momentum is conserved in a collision`: gravity 0; circles radius 10, mass 1 at (0,0) with v (50,0) and mass 3 at (25, 4) with v (−10, 0); 60 steps. `m1·v1 + m2·v2` in x and y within `1e-6` of the start.
- [x] **Step 2:** Run `npx vitest run tests/systems/stability.test.ts` on the current solver. Set `STACK_DRIFT`, `STACK_SINK`, `PYRAMID_SPEED` to the measured values rounded up by ~20% and record the measured numbers in this plan under "Task 2 baseline". Expected: PASS.
- [x] **Step 3:** Update `tests/systems/README.md`; run lint, typecheck, test.
- [x] **Step 4:** Commit `test: add solver stability regression tests (#22)`.

**Task 2 baseline:** on `dev` the resting box and momentum tests pass. The ten-box stack collapses (top box ends 130.8 px sideways and 180.0 px below its resting centre, i.e. on the floor) and the 210-body pyramid never settles (mean speed 55.5 px/s after 600 steps). Those two use the spec bars instead (`STACK_DRIFT` 1, `STACK_SINK` 1, `PYRAMID_SPEED` 5) and are `test.fails` until Task 8 flips them to `test`.

### Task 3: Fixed-step accumulator

**Files:** Create `src/app/FixedStep.ts`, test in `tests/app/app.test.ts` (new `describe("fixed step")`); modify `src/main.ts`, `src/app/README.md`, `engine-typescript/README.md` (Scenes: demo and sandbox now step at a fixed 60 Hz).

**Interfaces — Produces:** `class FixedStep { constructor(stepSeconds = 1 / 60, maxStepsPerFrame = 5); readonly stepSeconds: number; advance(frameSeconds: number): number }` — adds `frameSeconds` to the accumulator, returns the number of steps to run, keeps the remainder, and when the count would exceed `maxStepsPerFrame` returns the cap and drops the leftover time.

- [x] **Step 1: Failing tests** (use `new FixedStep(0.25, 5)` so the arithmetic is exact in binary): `advance(0.25)` → 1; `advance(0.125)` twice → 0 then 1; `advance(0.625)` → 2, then `advance(0.125)` → 1 (remainder carried); `advance(5)` → 5, then `advance(0)` → 0 (excess dropped); default `stepSeconds` is `1 / 60`.
- [x] **Step 2:** Run, expect FAIL (module missing).
- [x] **Step 3:** Implement `FixedStep`. In `main.ts` non-benchmark branch: `const steps = fixedStep.advance(deltaTime); for (…) update.run(world, fixedStep.stepSeconds)`. Benchmark branch unchanged. Render keeps `deltaTime`.
- [x] **Step 4:** Run tests, expect PASS; README rows; lint/typecheck/build/test.
- [x] **Step 5:** Commit `feat: step demo scenes at a fixed 60 Hz (#22)`.

### Task 4: Solver resources

**Files:** Create `src/resources/SolverSettings.ts`, `src/resources/ContactManifolds.ts`, `src/resources/PseudoVelocities.ts`, `tests/resources/solverResources.test.ts` (+ `tests/resources/README.md` and a link in `tests/README.md` if the folder is new); modify `src/resources/README.md`.

**Interfaces — Produces:**
- `interface SolverSettings { velocityIterations: number; pseudoVelocityIterations: number; beta: number; slop: number; restitutionThreshold: number }`, `createSolverSettings(): SolverSettings` → `{ 8, 3, 0.2, 0.5, 20 }` (threshold in px/s; tuned in Task 9), `SolverSettingsResource`.
- `MAX_MANIFOLD_POINTS = 2`.
- `class ContactManifolds`, `ContactManifoldsResource`:
  - `get count(): number`
  - Per-manifold columns (readonly getters to the current buffer's arrays, re-read after `add`): `entityA`, `entityB` (`Uint32Array`), `velocitySlotA`, `velocitySlotB` (`Int32Array`, −1 = immovable), `inverseMassA/B`, `inverseInertiaA/B`, `normalX`, `normalY`, `friction`, `restitution` (`Float64Array`), `pointCount` (`Uint8Array`).
  - Per-point columns, index `manifold * MAX_MANIFOLD_POINTS + k`: `pointX`, `pointY`, `anchorAX`, `anchorAY`, `anchorBX`, `anchorBY`, `depth`, `normalMass`, `tangentMass`, `velocityBias`, `normalImpulse`, `tangentImpulse`, `pseudoImpulse` (`Float64Array`), `featureId` (`Int32Array`).
  - `beginStep(): void` — current buffer becomes previous (with a `Map<number, number>` from pair key `entityIndex(a) * 2 ** 20 + entityIndex(b)` to manifold index), count resets to 0.
  - `add(entityA: Entity, entityB: Entity): number` — returns the new manifold index, doubling capacity when full; impulses of its points start at 0.
  - `inheritImpulses(manifold: number): void` — finds last step's manifold with the same *full* entities (index and generation); for each point whose `featureId` equals a previous point's, copies `normalImpulse` and `tangentImpulse`. Never `pseudoImpulse`.
- `class PseudoVelocities { x: Float64Array; y: Float64Array; angular: Float64Array; ensureCapacity(count: number): void; clear(): void }`, `PseudoVelocitiesResource`. Indexed by `Velocity` store slot.

- [x] **Step 1: Failing tests:** defaults equal the spec values; `add` 300 manifolds from capacity 64 keeps every entity pair readable; `inheritImpulses` copies by matching feature ID and zeroes a non-matching one; a pair re-added with the same index but a different generation inherits nothing; `pseudoImpulse` is never inherited; `PseudoVelocities.ensureCapacity(100)` gives arrays of length ≥ 100, all zero after `clear()`.
- [x] **Step 2:** Run, expect FAIL.
- [x] **Step 3:** Implement. Use `entityIndex` from `src/ecs/Entity.ts`.
- [x] **Step 4:** Run, expect PASS; READMEs; lint/typecheck/build/test.
- [x] **Step 5:** Commit `feat: add solver settings, contact manifolds and pseudo-velocity resources (#22)`.

### Task 5: Two-point manifolds from the narrow phase

**Files:** Create `src/collisionDetectionSystem/ContactManifold.ts`; modify `src/collisionDetectionSystem/narrowPhase.ts`, `tests/collision/narrowPhase.test.ts`, `src/collisionDetectionSystem/README.md`, `tests/collision/README.md`. `Contact.ts` is deleted in Task 8 once nothing uses it.

**Interfaces — Produces:**
- `class ContactManifold { normalX: number; normalY: number; pointCount: number; readonly pointX: Float64Array(2); readonly pointY; readonly depth; readonly featureId: Int32Array(2); clear(): void }`.
- `testCollision(colliders, slotA, slotB, centerAX, centerAY, centerBX, centerBY, out: ContactManifold): boolean` — same arguments as today, normal still A→B, depth > 0 per point.

Algorithm for polygon–polygon (Box2D-Lite clipping), replacing the single deepest vertex:
1. Keep today's SAT choice of reference polygon (smaller penetration; A on ties goes to B as today) but also return the reference edge index from `deepestContact`.
2. Incident edge: the other polygon's edge whose world normal has the smallest dot product with the reference normal.
3. Clip the incident edge's two vertices against the reference edge's two side planes (Sutherland–Hodgman segment clip, planes through the reference edge's end vertices along ±edge direction).
4. Keep clipped points with separation `(p − refStart)·refNormal < 0`; `depth = −separation`; the point stays on the incident polygon.
5. Normal = reference normal, negated when the reference polygon is B.
6. `featureId = (flip << 15) | (referenceEdge << 10) | (incidentEdge << 5) | end` where `end` is 0/1 for the clipped endpoint. Circle–circle: 0. Circle–polygon edge: edge index. Circle–polygon corner: `16 + vertexIndex`.

Circle cases keep today's maths, written as a one-point manifold.

- [x] **Step 1: Update and add tests:** all existing cases read `out.pointX[0]` etc. and assert `pointCount === 1` for circle cases. New: two 20×20 boxes, B at (0, 15) → `pointCount` 2, both depths ≈ 5, normal (0,1), points at x ≈ −10 and 10; B at (6, 15) → points at x ≈ −4 and 10; B rotated 0.3 rad resting on a corner → `pointCount` 1; feature IDs of the two points differ and are equal across two calls with B moved 0.1 px.
- [x] **Step 2:** Run `npx vitest run tests/collision/narrowPhase.test.ts`, expect FAIL.
- [x] **Step 3:** Implement. The solver still compiles against the old `Contact` until Task 8, so for now `CollisionSolverSystem` builds a `Contact` from the *deepest* point of a `ContactManifold` (a small adapter, deleted in Task 8). For polygon pairs this can pick a different vertex than today's, so re-run `stability.test.ts`; it must still pass with Task 2's thresholds.
- [x] **Step 4:** Run all tests, expect PASS; READMEs; lint/typecheck/build.
- [x] **Step 5:** Commit `feat: clip polygon contacts into two-point manifolds (#22)`.

### Task 6: Sequential-impulse maths

**Files:** Create `src/collisionDetectionSystem/sequentialImpulse.ts`, `tests/collision/sequentialImpulse.test.ts`; modify both READMEs.

**Interfaces — Consumes:** `ContactManifolds`, `PseudoVelocities`, `SolverSettings` (Task 4). **Produces** (`VelocityColumns = Columns<(typeof Velocity)["schema"]>`; a slot of −1 means the body is immovable and is never written):
- `prepareContacts(manifolds: ContactManifolds, velocities: VelocityColumns, settings: SolverSettings): void` — per point: `normalMass = 1 / (imA + imB + iiA·(rA×n)² + iiB·(rB×n)²)`, same for `t`; skip (masses 0) when the denominator is 0. `vn` = relative normal velocity of B minus A at the point; `velocityBias = −restitution · vn` when `−vn > restitutionThreshold`, else 0.
- `warmStart(manifolds, velocities): void` — applies `P = n·normalImpulse + t·tangentImpulse` to both bodies (A negative, B positive).
- `solveVelocities(manifolds, velocities): void` — one pass. Per point, friction first then normal: friction `λ = −tangentMass · vt`, accumulate and clamp to `±friction · normalImpulse`, apply the change; normal `λ = −normalMass · (vn − velocityBias)`, accumulate, clamp `≥ 0`, apply the change.
- `solvePseudoVelocities(manifolds, pseudo: PseudoVelocities, settings, deltaTime: number): void` — one pass on pseudo-velocities only: target `beta · max(depth − slop, 0) / deltaTime`, `λ = normalMass · (target − vnPseudo)`, accumulate `pseudoImpulse` clamped `≥ 0`, apply the change.
- `recordFrictionArrows(manifolds: ContactManifolds, log: ContactLog): void` — per point with `tangentImpulse ≠ 0`, arrow from the point along `t · sign(tangentImpulse)`, length 40.

- [x] **Step 1: Failing tests** on hand-built manifolds (use `ContactManifolds.add` and set columns directly):
  - head-on circles, masses 1, v ±10, restitution 0.5, normal (1,0): after prepare + 8 passes, v ≈ −5 and +5.
  - restitution 0 on both: no NaN, both end with relative normal velocity ≈ 0.
  - closing speed below `restitutionThreshold` doesn't bounce (relative normal velocity ends ≈ 0 with restitution 1).
  - separating bodies: velocities unchanged, accumulated normal impulse 0.
  - friction: box sliding at vx 10 on a static floor with normalImpulse warm-started to 1 and friction 0.5: |tangentImpulse| ≤ 0.5 after any number of passes; sliding left (vx −10) gives the mirrored result (negative-tangent bug).
  - pseudo solve: depth 3, slop 0.5, beta 0.2, dt 1/60 → pseudo vy non-zero, real velocities exactly unchanged, `pseudoImpulse ≥ 0`.
  - immovable side (slot −1) is never written.
- [x] **Step 2:** Run, expect FAIL.
- [x] **Step 3:** Implement with `Math.sqrt`, not `Math.hypot`, and no `slotOf` in the loops.
- [x] **Step 4:** Run, expect PASS; READMEs; lint/typecheck/build/test.
- [x] **Step 5:** Commit `feat: add sequential-impulse and split-impulse solver passes (#22)`.

#### Handoff checkpoint (after Task 6)

State: resources, manifold narrow phase and solver maths exist and are unit-tested; the production schedule still runs the old solver. Next is wiring (Tasks 7–8).

> Resume prompt: Continue `superpowers/plans/2026-11-14-physics-performance-phase-1.md` on `feature/contact-solver` from Task 7. Tasks 1–6 are ticked and committed; don't redo them. Read the plan's Global Constraints and Review Focus first.

### Task 7: Contact detection system

**Files:** Create `src/systems/ContactDetectionSystem.ts`, `tests/systems/contactDetection.test.ts`; modify `src/systems/README.md`, `tests/systems/README.md`.

**Interfaces — Consumes:** `CandidatePairsResource`, `ContactsResource`, `ContactManifoldsResource`, `testCollision` + `ContactManifold`, `BodyColumns`, `aabbOverlap`, `DEFAULT_RESTITUTION`/`DEFAULT_FRICTION`. **Produces:** `createContactDetectionSystem(world: World): System` (sets `ContactManifoldsResource` in the factory when missing).

Per step: `contacts.clear()`; `colliders.columns.touching.fill(0)`; `manifolds.beginStep()`; for each pair: AABB overlap → set `touching` 1 on both; skip when both inverse masses are 0; `testCollision`; on hit `add`, store velocity slots (−1 without `Velocity`), inverse mass/inertia from `Mass` (0 without), normal, `restitution = max(a, b)`, `friction = √(a·b)` (defaults when a body has no `Material`), per point `pointX/Y`, anchors `point − centre`, depth, featureId; `inheritImpulses`; `recordContact` per point.

- [x] **Step 1: Failing tests:** a box resting flat on a floor gives 1 manifold with 2 points and 2 logged contacts; `touching` is 1 for overlapping and 0 for far bodies; two overlapping static bodies give 0 manifolds; restitution 0.2 vs 0.7 combines to 0.7 and friction 0.4 vs 0.9 to 0.6; a body with its `Material` removed combines with the defaults without NaN; a manifold with impulses set, re-detected next step, keeps them; after `destroyEntity(b)` and a new entity on the same index overlapping `a`, the new manifold's impulses are 0.
- [x] **Step 2:** Run, expect FAIL.
- [x] **Step 3:** Implement (not yet in the schedule).
- [x] **Step 4:** Run, expect PASS; READMEs; lint/typecheck/build/test.
- [x] **Step 5:** Commit `feat: add contact detection system (#22)`.

### Task 8: Split integration and switch the schedule

**Files:**
- Create `src/systems/VelocityIntegrationSystem.ts`, `src/systems/VelocitySolveSystem.ts`, `src/systems/PseudoVelocitySolveSystem.ts`, `src/systems/PositionIntegrationSystem.ts`, `tests/systems/solverBehaviour.test.ts`.
- Modify `src/app/schedules.ts`, `src/systems/ColliderTransformSystem.ts` (stop writing `touching`), `src/app/DemoScene.ts` (`installWorldResources` sets `SolverSettingsResource`), `tests/systems/collision.test.ts`, `tests/systems/integration.test.ts`, `tests/collision/README.md`, `tests/systems/README.md`, `src/systems/README.md`, `src/collisionDetectionSystem/README.md`, `engine-typescript/docs/ecs-guide.md` (update-order table ~L145–163 and where new systems go).
- Delete `src/systems/RigidBodyIntegrationSystem.ts`, `src/systems/CollisionSolverSystem.ts`, `src/collisionDetectionSystem/contactResolution.ts`, `src/collisionDetectionSystem/Contact.ts`, `tests/collision/contactResolution.test.ts` (its restitution and friction cases are covered by Task 6 and below).

**Interfaces — Produces:** `createVelocityIntegrationSystem`, `createVelocitySolveSystem`, `createPseudoVelocitySolveSystem`, `createPositionIntegrationSystem`, each `(world: World): System`; solver systems set `SolverSettingsResource` / `PseudoVelocitiesResource` in the factory when missing.

- Velocity integration: today's view `[Transform, Velocity, ForceAccumulator, Mass, LinearDamping, Sleep]` without `Particle`; `v += F·invM·dt`, `ω += τ·invI·dt`, then damping, then today's small-velocity snap, then clear forces. No position change.
- Velocity solve: `prepareContacts`, `warmStart`, `velocityIterations × solveVelocities`, `recordFrictionArrows` when `ContactsResource` is present.
- Pseudo solve: `ensureCapacity(velocity store size)`, `pseudoVelocityIterations × solvePseudoVelocities`.
- Position integration: view `[Transform, Velocity, Sleep]` without `Particle` (same bodies as velocity integration; phase 2 replaces `Sleep`); `x += (v + pv)·dt`, `angle += (ω + pω)·dt`; zero that slot's pseudo-velocity.
- Schedule: `playerInput, mouseDrag, intentForce, gravity, wind, jointForce, velocityIntegration, particleIntegration, broadPhase, contactDetection, velocitySolve, pseudoVelocitySolve, positionIntegration, colliderTransform`.

- [x] **Step 1: Write failing behaviour tests** (`solverBehaviour.test.ts`, using `physicsWorld`/`stepWorld` from Task 2):
  - `restitution r reaches about r² of its drop height`: floor restitution 0, ball radius 10 restitution 0.8, dropped from a 100 px gap; peak height after the first bounce within 10% of 64 px.
  - `restitution 0 does not bounce`: both 0; after impact the ball never rises more than 0.5 px; no NaN in any velocity.
  - `box slides on a slope steeper than atan(μ)`: friction 0.5 on box and floor (μ 0.5, atan ≈ 26.6°), gravity `200·(sin θ, cos θ)` with θ 35°: x moves > 20 px in 2 s; θ −35°: x moves < −20 px.
  - `box holds on a shallower slope`: θ ±15°: |x drift| < 0.5 px over 2 s after settling.
  - `friction ignores restitution`: box sliding at vx 100 on a floor, all restitution 0 vs all 0.9; vx after 30 steps equal within 1e-6.
  - `overlap is removed without adding velocity`: gravity 0, box 3 px into a static floor; every step `|v|` and `|ω|` `< 1e-12`; after 60 steps depth ≤ slop + 0.01.
  - `touching survives to rendering`: two overlapping boxes, one full update step, both `touching === 1`.
- [x] **Step 2:** Run, expect FAIL (old schedule).
- [x] **Step 3:** Implement the four systems, switch the schedule, delete the old files and the Task 5 adapter.
- [x] **Step 4: Update existing tests:**
  - `collision.test.ts` local `physicsSchedule` uses the new order; `two overlapping boxes end up separated` becomes "separate within 60 steps, gap > 20 − slop − 0.01, velocities ≈ 0"; `two worlds' collision matrices are independent` keeps `right.x > 10` after one step; `touching` test runs detection; contact count test still expects 1–2.
  - `integration.test.ts`: the Euler test now runs velocity then position integration and expects vy ≈ 19.98 and y ≈ 101.998 (position uses damped velocity); the transform test no longer expects `touching` reset.
- [x] **Step 5:** Run the whole suite including `stability.test.ts` (Task 2 thresholds unchanged), expect PASS. If a stability test fails, stop and go to Task 9 tuning before loosening anything.
- [x] **Step 6:** READMEs and `ecs-guide.md`; lint/typecheck/build/test.
- [x] **Step 7:** Commit `feat: solve contacts with cached manifolds and split impulses (#22)`.

### Task 9: Tune iterations, beta and the restitution threshold

**Files:** Modify `src/resources/SolverSettings.ts` (only if values change), the plan's "Task 9 results".

- [x] **Step 1:** In the browser (`?scene=benchmark`, Brave) and `npm run bench`, record solver system times at the defaults.
- [x] **Step 2:** Lower `velocityIterations` one at a time until a stability or behaviour test fails or the benchmark pyramid visibly jitters; set the default to that value + 2 (never above 8 without a recorded reason). Same for `pseudoVelocityIterations` (+1 margin). Try `beta` 0.2/0.4/0.8 against the stack test; keep the most stable. Set `restitutionThreshold` to the lowest value where the resting-box test shows no bounce.
- [x] **Step 3:** Record each tried value and its result here; run the full suite.
- [x] **Step 4:** Commit `perf: tune solver settings (#22)`.

**Task 9 results** (with the Task 10 block solver in; headless, 1/60 s steps):

- The existing tests pass at every velocity count from 1 to 8, so they can't pick the count. A twenty-box stack and a 465-body pyramid measured over 600–900 steps can:

  | velocity / pseudo / β | 20-stack top drift px | 20-stack sink px | top-box jitter px/step | pyramid p98 speed px/s |
  | --- | --- | --- | --- | --- |
  | 8 / 3 / 0.2 | 0.29 | 5.80 | 0.029 | 0.07 |
  | 6 / 3 / 0.2 | 3.27 | 5.36 | 0.055 | 0.11 |
  | 4 / 3 / 0.2 | 0.40 | 4.80 | 0.119 | 0.00 |
  | 3 / 3 / 0.2 | 95.6 (collapses) | 21.1 | 0.369 | 0.02 |
  | 2 / 3 / 0.2 | 833 (collapses) | 1585 | 10.9 | 0.02 |
  | 4 / 2 / 0.2 | 114 (collapses) | 25.5 | 0.510 | 0.53 |
  | 4 / 1 / 0.2 | 0.17 | 4.87 | 0.122 | 0.00 |
  | 4 / 3 / 0.4 | 0.52 | 4.66 | 0.120 | 0.10 |
  | 4 / 3 / 0.8 | 13.3 | 4.70 | 0.119 | 0.29 |

  The tall stack is close to its limit: results jump around between neighbouring settings, it collapses at 3 velocity passes, and the jitter rises steadily as passes drop. **Kept 8 velocity, 3 pseudo-velocity, β 0.2.** The twenty-box stack is now a test.
- Restitution threshold: a resting body closes at g·dt = 3.33 px/s per step. Below about 4 a box resting in contact bounces; at 5 a dropped box falls into a bounce loop (one step airborne gives 6.67 px/s, above the threshold); 10 and 12 fail a system test; 8, 15 and 20 pass. **Kept 20 px/s.**
- Browser timings are left for Task 11.

### Task 10 (optional): Block solver for two-point manifolds

Only if Task 9 leaves the stack or pyramid needing more than 8 velocity passes, or the stack test shows rocking.

**Files:** `src/collisionDetectionSystem/sequentialImpulse.ts`, its tests.

- [x] **Step 1: Failing test:** a box resting flat on a floor reaches a steady normal impulse split (both points within 1% of half the weight·dt) in fewer passes than the sequential solve.
- [x] **Step 2:** Implement Box2D's 2×2 normal block solve (four cases: both active, only point 1, only point 2, none), used when `pointCount === 2`; friction stays sequential.
- [x] **Step 3:** Keep it only if the stack test drift or the needed pass count improves; record the comparison. Otherwise revert.
- [x] **Step 4:** Commit `feat: add block solver for two-point manifolds (#22)` or record "not kept".

### Task 11: Measure and record

**Files:** Modify the spec (Results row 1, a "Phase 1 split" table like "Phase 0 baseline split", Phase 1 Status), `engine-typescript/README.md` Scenes (if the benchmark readout or demo behaviour text changed).

- [x] **Step 1:** Browser benchmark (same Brave and machine as phase 0): copy the console table; `npm run bench` twice.
- [x] **Step 2:** (met: browser update 7.42 ms) Fill in Results row 1 and the per-system table; note whether the 16.7 ms target is met. If not, record what's slow and stop before phase 2.
- [ ] **Step 3:** Side-by-side visual check of `?scene=demo` and `?scene=benchmark` against `dev`; note differences (expected: less bounce, steadier boxes).
- [x] **Step 4:** (handoff added; Status stays "built and measured" until the visual check) Set Phase 1 Status to done and add a "Handoff: phase 1 done, phase 2 next" section with a resume prompt.
- [ ] **Step 5:** lint/typecheck/build/test; commit `docs: record phase 1 results (#22)`; push; open the PR into `dev` per CONTRIBUTING.md.

### Task 12: Review follow-ups

Two minors from the final review, fixed before the PR. Two others moved into the spec: the block solver's per-pass matrix rebuild to Phase 4 (item 6), and integration requiring `Sleep` and `LinearDamping` to Phase 2.

**Files:** Modify `src/systems/ContactDetectionSystem.ts`, `tests/systems/contactDetection.test.ts`, `tests/systems/stability.test.ts`, `src/systems/README.md` (detection row).

- [x] **Step 1: Failing test** in `contactDetection.test.ts`: `a body with mass but no velocity is immovable in its contacts`. Floor, box A on it with `Velocity` removed, box B resting on A. After one detection run the A–B manifold has A's side with `velocitySlot −1`, `inverseMass 0`, `inverseInertia 0`, and the floor–A pair gives no manifold (both sides immovable).
- [x] **Step 2:** Run, expect FAIL (A's inverse mass is 1 today).
- [x] **Step 3:** In `ContactDetectionSystem`, a body is movable only when it has both `Mass` and `Velocity`; otherwise its inverse mass and inertia are 0.
- [x] **Step 4:** Run, expect PASS.
- [x] **Step 5: Tighter stack sink bar.** Measure the top box's sink for the 10- and 20-box stacks, replace `height × slop` with a fixed `STACK_SINK` about 50% above the larger measured value (about 2 px), record the numbers here, and check the test still fails on a softer solver (`velocityIterations` 1 or `beta` 0).
- [x] **Step 6:** README row; lint/typecheck/build/test; commit `fix: treat bodies without velocity as immovable in contacts (#22)` and `test: tighten the stack sink bar (#22)`.

**Task 12 results:** top-box sink at the defaults is 1.13 px for 10 boxes and 5.80 px for 20, so one fixed 2 px bar would fail the 20-box stack. Ruling: one bar per height, about 50% above the measurement: 2 px (10 boxes) and 9 px (20 boxes). With 1 velocity pass both stacks collapse (sink 173 and 1763 px); with 2 passes the 20-box stack collapses. β 0 or no pseudo passes give the same sink (1.12 / 6.07 px) over 600 steps, so the sink bar cannot catch missing position correction; the overlap-removal test in `solverBehaviour.test.ts` covers that.

## Verification

- Every task: `npm run lint && npm run typecheck && npm run build && npm run test` in `engine-typescript/`.
- Stability guard: `tests/systems/stability.test.ts` passes with thresholds set from `dev` in Task 2, unchanged after Task 8.
- Behaviour: `tests/systems/solverBehaviour.test.ts` and `tests/collision/sequentialImpulse.test.ts`.
- Performance: `?scene=benchmark` in Brave, update under 16.7 ms; `npm run bench` per-system table.
- Visual: `npm run dev`, compare `?scene=demo`, `?scene=benchmark` and `?scene=sandbox` with `dev`.
