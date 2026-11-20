# Physics performance phase 2: real sleeping — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Tick each box as its step finishes and commit the ticks with the task.

**Goal:** Bodies that stay still leave the step until something disturbs them, first per body (part A), then per island (part B), so the settled 2,000-body pyramid costs a fraction of a falling one while stacks stay as stable as after phase 1.

**Architecture:** Tags `Asleep` and `NeverSleep`, a `SleepTimer` component and a `SleepSettings` resource replace `Sleep`. A `sleep` system at the end of the step counts still time and puts bodies (part A) or whole islands (part B) to sleep, recording each sleeping group in a `SleepingIslands` resource. Active systems exclude `Asleep`. All waking goes through `src/sleeping/wakeBodies.ts`, which wakes a body's whole recorded group. A `wakeOnWorldChange` system first in the step wakes everything when gravity, wind, the collision matrix or `SleepSettings.enabled` change. Part B adds an `islands` system (union-find over manifolds and joints) right after `contactDetection`.

**Tech Stack:** TypeScript, the project ECS (`src/ecs/`), Vitest, Vite.

**Spec:** `superpowers/specs/2026-11-13-physics-performance-design.md`, Phase 2, especially "Phase 2 decisions", plus Measuring and Testing (sleeping, waking without motion). Read it alongside this plan.

## Global Constraints

- No comments anywhere; lint rejects them (AGENTS.md rule 1).
- `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test` in `engine-typescript/` all pass at the end of every task.
- Every added, removed, renamed or changed file updates its folder `README.md` row in the same commit (`| File | Purpose |` table, backticked names, alphabetical). New test files need rows in their `tests/<folder>/README.md`. A new folder needs its own `README.md` and a row in `src/README.md`.
- Physics layer imports only physics, ecs, math, types; no browser globals. The new `src/sleeping/` folder joins the physics layer by adding `"sleeping/**"` to the physics `files` list in `lint/layerMap.js`. Never touch its `exceptions`.
- Imports use `@/…`; `./` only within the same folder; no `../`.
- Commits: Conventional Commits, subject ends with `(#23)`, plus the session attribution trailer.
- Branch: `feature/sleeping` (exists, has the updated spec).
- Spec values: `SleepSettings` `enabled` true, `timeout` 0.5 s, `linearThreshold` 1 px/s, `angularThreshold` 0.035 rad/s. Fixed step 1/60 s. `LinearDamping` stays required.
- `ComponentStore.columns` arrays are replaced on growth: capture the `columns` object, never `columns.x`.
- Adding or removing `Asleep` is structural: always through `world.defer`, and every deferred command checks `world.isAlive(entity)`.

## Review Focus

1. **Sleeping at the top of a throw.** A body thrown straight up is below 1 px/s for a moment at its apex. It must never get `Asleep` in mid-air (Task 4 test).
2. **Recycled entity index.** A body recorded in `SleepingIslands` is destroyed and its index reused. Waking the old ID must not touch the new body (Task 3 test).
3. **A held body falls asleep.** A body held still under the mouse balances the drag force against gravity. It must stay awake for as long as it's held, or the drag stops working (Task 5 test).
4. **A woken body jumps.** Falling asleep clears velocity and force, so a body's first step after waking must show only that step's gravity, with no stored force or old velocity (Task 5 test).
5. **Bodies spawned mid-run.** Union-find and island arrays are sized by `world.entityCapacity`. Bodies spawned after the first step must still join islands (Task 10 test).

---

## Part A: per-body sleeping

### Task 1: Save the plan

**Files:** Create `superpowers/plans/2026-11-14-physics-performance-phase-2.md` (this document); the spec is already updated.

- [x] **Step 1:** Confirm the spec's Phase 2 Status line names this plan, issue #23 and `feature/sleeping`.
- [x] **Step 2:** Commit the spec and plan: `docs: settle phase 2 decisions and add the plan (#23)`.

### Task 2: Sleep components replace `Sleep`, and integration stops snapping

**Files:**
- Create: `src/components/Asleep.ts`, `src/components/NeverSleep.ts`, `src/components/SleepTimer.ts`, `src/resources/SleepSettings.ts`
- Delete: `src/components/Sleep.ts`
- Modify: `src/components/bodyFactories.ts`, `src/systems/VelocityIntegrationSystem.ts`, `src/systems/PositionIntegrationSystem.ts`, `src/app/DemoScene.ts` (player `canSleep: false`; `installWorldResources` sets `SleepSettingsResource`), READMEs of `src/components/`, `src/resources/`, `src/systems/`
- Test: `tests/components/bodyFactories.test.ts`, `tests/systems/integration.test.ts`, `tests/resources/solverResources.test.ts`

**Interfaces — Produces:**
- `Asleep = defineComponent("Asleep", {})`, `NeverSleep = defineComponent("NeverSleep", {})`, `SleepTimer = defineComponent("SleepTimer", { sleepTime: "f64" })`.
- `interface SleepSettings { enabled: boolean; linearThreshold: number; angularThreshold: number; timeout: number }`, `createSleepSettings(): SleepSettings`, `SleepSettingsResource`.
- `BodyOptions.canSleep?: boolean` (default `true`). Movable bodies get `SleepTimer` (`sleepTime` 0), and also `NeverSleep` when `canSleep` is `false`. Static bodies get neither.
- Velocity and position integration views: `[Velocity, ForceAccumulator, Mass, LinearDamping]` and `[Transform, Velocity]`, both `without: [Particle, Asleep]`.

- [x] **Step 1: Failing tests.**
  - `bodyFactories.test.ts`: a movable body has `SleepTimer` with `sleepTime` 0 and `LinearDamping`, and no `NeverSleep`. `canSleep: false` adds `NeverSleep`. A static body has no `SleepTimer`. Replace the old `Sleep` threshold assertion.
  - `solverResources.test.ts`: `createSleepSettings()` equals `{ enabled: true, linearThreshold: 1, angularThreshold: 0.035, timeout: 0.5 }`.
  - `integration.test.ts`: replace `slow body is put to sleep` with `slow body keeps drifting`: velocity `(0.005, 0, 0.005)`, gravity 0, 60 steps; x has grown by more than `0.004` (0.005 px/s for 1 s, less damping), and velocity x and angular are both > 0. Add `body without a sleep timer still falls`: remove `SleepTimer` from a fresh body, 30 steps under gravity `(0, 200)`, y increased.
- [x] **Step 2:** Run `npx vitest run tests/components tests/systems/integration.test.ts tests/resources`. Expected: FAIL (modules missing).
- [x] **Step 3:** Implement. Delete `Sleep.ts` and `DEFAULT_SLEEP_THRESHOLD`. Remove the threshold snap from `VelocityIntegrationSystem` (the integrate callback loses its sleep slot). The demo player gets `canSleep: false`.
- [x] **Step 4:** Run the whole suite. Expected: PASS. If a stability bar fails because slow drift is no longer snapped, record the measured value here and stop to ask the owner. Don't loosen a bar silently (spec anti-goal).
- [x] **Step 5:** READMEs; lint, typecheck, build, test. Commit `feat: replace Sleep with sleep tags, timer and settings (#23)`.

**Task 2 measurement:** without the snap, the twenty-box stack drifts sideways (top box 0.05 px at step 180, 0.72 px at 480, 2.47 px at 600) while every box stays under 1 px/s from about step 120. Sleeping (Task 4) freezes it near step 150, so the test is `test.fails` until Task 4 flips it back. The ten-box stack and every other bar pass.

### Task 3: Sleeping islands record and the wake helpers

**Files:**
- Create: `src/resources/SleepingIslands.ts`, `src/sleeping/wakeBodies.ts`, `src/sleeping/README.md`
- Modify: `lint/layerMap.js` (physics `files` gets `"sleeping/**"`), `src/README.md` (folder row), `src/resources/README.md`
- Test: create `tests/sleeping/wakeBodies.test.ts`, `tests/sleeping/README.md`

**Interfaces — Produces:**
- `class SleepingIslands { record(members: readonly Entity[]): void; take(entity: Entity): readonly Entity[]; clear(): void; get count(): number }` + `SleepingIslandsResource`. `take` removes and returns the members of the island holding `entity` (matched by full entity ID, generation included), or `[entity]` when it holds none. A `Map<Entity, number>` plus a `Map<number, Entity[]>` is enough; these calls are rare.
- `src/sleeping/wakeBodies.ts`:
  - `installSleepResources(world: World): void` sets `SleepSettingsResource` and `SleepingIslandsResource` when missing.
  - `wakeBody(world: World, entity: Entity): void` sets `sleepTime` to 0 at once when the body has a `SleepTimer`. If the body has `Asleep`, it defers one command: take its island, and for each alive member remove `Asleep` and zero `sleepTime`.
  - `wakeAllBodies(world: World): void` defers waking every `Asleep` body and `SleepingIslands.clear()`.
  - `wakeBodiesOverlapping(world: World, minX: number, minY: number, maxX: number, maxY: number): void` calls `wakeBody` for each `[Asleep, Collider]` body whose bounds overlap the rectangle grown by `WAKE_MARGIN = 1` px.
  - `fallAsleep(world: World, members: readonly Entity[]): void` defers: for each alive member, zero `Velocity` and `ForceAccumulator`, add `Asleep`; then `record` the alive members.

- [x] **Step 1: Failing tests** (`tests/sleeping/wakeBodies.test.ts`; bodies from `spawnRigidBody`, then `world.flushDeferred()` where needed):
  - `fallAsleep zeroes motion and tags the group`: two bodies with velocity and force; after flush both have `Asleep`, zero velocity and force, and `SleepingIslands.count` is 1.
  - `waking one member wakes the whole group`: `fallAsleep([a, b, c])`, flush, set every `sleepTime` to 0.4; `wakeBody(world, b)`, flush. None has `Asleep`, every `sleepTime` is 0, `count` is 0.
  - `wakeBody resets the timer before the flush`: an awake body with `sleepTime` 0.4 reads 0 straight after `wakeBody`, with no flush.
  - `a recycled entity is not woken`: `fallAsleep([a, b])`, flush, `world.destroyEntity(a)`, create a body `c` (reuses `a`'s index), `world.add(c, Asleep)`; `wakeBody(world, b)`, flush. `b` is awake and `c` still has `Asleep`.
  - `wakeAllBodies wakes every sleeper`: two separate groups asleep; after `wakeAllBodies` and a flush, no body has `Asleep` and `count` is 0.
  - `wakeBodiesOverlapping wakes only overlapping sleepers`: two sleeping 10×10 boxes at x 0 and x 100; a rectangle around x 0 wakes only the first. A rectangle ending 0.5 px short of a box still wakes it (margin).
- [x] **Step 2:** Run `npx vitest run tests/sleeping`. Expected: FAIL.
- [x] **Step 3:** Implement. `src/sleeping/README.md` follows the other folder READMEs (one-line folder purpose + `Layer: physics`, then the file table).
- [x] **Step 4:** Run the tests again. Expected: PASS. Then lint (layer map and README checks), typecheck, build, test.
- [x] **Step 5:** Commit `feat: add sleeping islands record and wake helpers (#23)`.

### Task 4: The sleep system, and active systems skip sleepers

**Files:**
- Create: `src/systems/SleepSystem.ts`
- Modify: `src/app/schedules.ts` (add `"sleep"` last), `src/systems/GravitySystem.ts`, `src/systems/WindSystem.ts`, `src/systems/ColliderTransformSystem.ts` (views gain `without: [Asleep]`), `src/systems/README.md`
- Test: create `tests/systems/sleeping.test.ts`; modify `tests/systems/physicsWorld.ts`, `tests/systems/README.md`

**Interfaces:**
- Consumes: `installSleepResources`, `fallAsleep` (Task 3).
- Produces: `createSleepSystem(world: World): System`. It calls `installSleepResources` when created. Each step, if `enabled`, for each `[SleepTimer, Velocity]` body `without: [NeverSleep, Asleep, Particle]`: when `|v| < linearThreshold` and `|ω| < angularThreshold`, add `deltaTime` to `sleepTime`, otherwise set it to 0. A body whose `sleepTime ≥ timeout` goes to `fallAsleep(world, [entity])`. Part B replaces this per-body decision with islands.
- Produces (`physicsWorld.ts`): `isAsleep(world: World, entity: Entity): boolean`.

- [x] **Step 1: Failing tests** (`tests/systems/sleeping.test.ts`, gravity `(0, 200)`, floor `createRectangleShape(400, 20)` static at (0, 100), 20×20 box mass 1 at (0, 40), as in `stability.test.ts`):
  - `a resting box falls asleep`: within 300 steps the box has `Asleep` and zero velocity; record the step it first sleeps in this plan.
  - `a sleeper is not integrated`: once asleep, its position is identical over 120 more steps.
  - `a thrown body never sleeps in mid-air`: gravity `(0, 200)`, no floor, velocity `(0, -100, 0)`; over 120 steps (the apex is at 0.5 s), `isAsleep` is false at every step.
  - `a body that can't sleep never does`: the resting box spawned with `canSleep: false`, 600 steps, never `Asleep`.
  - `nothing sleeps when sleeping is disabled`: `SleepSettings.enabled = false`, 600 steps, never `Asleep`.
  - `stacks still stand with sleeping`: no new test; the stability suite still passes.
- [x] **Step 2:** Run `npx vitest run tests/systems/sleeping.test.ts`. Expected: FAIL.
- [x] **Step 3:** Implement and add the system to the schedule after `colliderTransform`.
- [x] **Step 4:** Run the whole suite. Expected: PASS.
- [x] **Step 5:** READMEs; lint, typecheck, build, test. Commit `feat: put still bodies to sleep and skip them in the step (#23)`.

**Task 4 measurement:** the resting box first sleeps at step 138. The twenty-box stack sleeps whole; its top box ends 0.037 px sideways and 5.59 px low (bar 9), so the test is back to `test`. Contact detection treating `Asleep` as immovable moved here from Task 5 (without it, awake boxes resting on a sleeper lose their support).

### Task 5: Waking on contact, joints, mouse drag and intent

**Files:**
- Modify: `src/systems/ContactDetectionSystem.ts`, `src/systems/JointForceSystem.ts`, `src/app/MouseDragSystem.ts`, `src/systems/IntentForceSystem.ts`, matching READMEs
- Test: `tests/systems/sleeping.test.ts`

**Interfaces — Consumes:** `wakeBody` (Task 3).

**Changes:**
- **Contact detection:** a body with `Asleep` counts as immovable (inverse mass and inertia 0, velocity slot −1). When one body of a pair is asleep and the other has inverse mass > 0, call `wakeBody` on the sleeper after the manifold is stored.
- **Joint forces:** a body can move when it has inverse mass > 0 and no `Asleep`. Skip a joint whose ends both can't move. When one end is asleep and the other can move, `wakeBody` the sleeper, then apply the forces as usual.
- **Mouse drag:** `wakeBody(world, drag.entity)` every step the drag is active, including the pick step.
- **Intent:** `wakeBody` the body when its intent `x`, `y` or `jump` is non-zero.

- [x] **Step 1: Failing tests** (each starts from the box asleep on the floor, as in Task 4):
  - `a falling box wakes a sleeper`: drop a second box from y −40 onto it. Within 120 steps the lower box has lost `Asleep` at least once (track it in `onStep`), and after 600 steps both are asleep again.
  - `a joint to an awake body wakes a sleeper`: add an awake box at (60, 40) and a `SpringJoint` between the two (as in `tests/systems/joints.test.ts`). After 1 step the sleeper is awake.
  - `a joint to a static body doesn't wake a sleeper`: add a `SpringJoint` between the sleeping box and the floor. After 60 steps the box is still asleep.
  - `dragging wakes a sleeper and keeps it awake`: set `MouseInput` `x`, `y` to the box centre and `leftDown = true`. After 1 step it's awake. Holding still for 300 more steps, it never gets `Asleep`.
  - `a woken body starts from rest`: wake the sleeper with `wakeBody`, step once with no floor contact (destroy the floor with `world.destroyEntity` first). The body's velocity is `(0, 200/60)` within `1e-9` after damping is accounted for: `toBeCloseTo(200 / 60 * 0.999, 9)`.
  - `setting a velocity and calling wakeBody moves a sleeper`: set its velocity to `(50, 0, 0)` and call `wakeBody`. After 1 step x has grown.
- [x] **Step 2:** Run the tests. Expected: FAIL.
- [x] **Step 3:** Implement the four changes.
- [x] **Step 4:** Run the whole suite. Expected: PASS.
- [x] **Step 5:** READMEs; lint, typecheck, build, test. Commit `feat: wake sleepers on contact, joints, drag and intent (#23)`.

**Task 5 note:** only a disturbing body (no `SleepTimer`, or `sleepTime` 0) wakes a sleeper by contact or joint. Without it, a box resting on a sleeping box woke it every time it fell asleep, and the two never slept together. The spec's Phase 2 decisions record the rule.

### Task 6: Waking without motion

**Files:**
- Create: `src/sleeping/worldEdits.ts`, `src/systems/WorldChangeWakeSystem.ts`
- Modify: `src/resources/CollisionSettings.ts` (`version`), `src/app/schedules.ts` (`"wakeOnWorldChange"` first), `src/app/SandboxScene.ts` (respawn uses `destroyBody`), `src/app/DemoScene.ts` (`resizeDemoWorld` ends with `wakeAllBodies`), matching READMEs
- Test: create `tests/sleeping/worldEdits.test.ts`; modify `tests/systems/sleeping.test.ts`

**Interfaces — Produces:**
- `destroyBody(world: World, entity: Entity): void`: `wakeBody(world, entity)`, then `wakeBodiesOverlapping` with the body's collider bounds, then `wakeBody` for the other end of each `SpringJoint` and `ForceJoint` naming it, then `world.destroyEntity(entity)`.
- `moveStaticBody(world: World, entity: Entity, x: number, y: number, angle: number): void`: wake sleepers overlapping the old bounds, set the `Transform`, `transformCollider(…, true)`, then wake sleepers overlapping the new bounds.
- `setCollisionGroup(world: World, entity: Entity, group: CollisionGroupInfo): void`: set the `CollisionGroup` and wake the sleepers overlapping the body's bounds.
- `CollisionSettings.version: number` (getter), incremented by `enableCollision` and `disableCollision`.
- `createWorldChangeWakeSystem(world: World): System` remembers gravity x/y, wind x/y, the `CollisionSettings` object and its `version`, and `SleepSettings.enabled`. On the first run it only records them. On later runs it calls `wakeAllBodies` when any of them has changed (including `enabled` going from true to false).

- [x] **Step 1: Failing tests:**
  - `destroying the bottom of a sleeping stack drops the rest`: a 3-box stack (as in `stability.test.ts`) asleep, `destroyBody` on the bottom box. Within 120 steps both other boxes are lower than before.
  - `destroying the floor wakes what rests on it`: the box asleep on the floor, `destroyBody(floor)`. After 30 steps the box has fallen.
  - `destroying a jointed body wakes the other end`: two sleeping boxes joined by a `SpringJoint`, far apart. `destroyBody` on one; after a flush the other is awake.
  - `moving a static body wakes what it touched`: `moveStaticBody` the floor 200 px down; after 30 steps the box has fallen.
  - `setCollisionGroup wakes overlapping sleepers`: after the call and a flush, the box on the floor is awake.
  - `changing gravity, wind or the collision matrix wakes every sleeper`: three cases (`setResource(GravityResource, { x: 0, y: -200 })`, wind `{ x: 50, y: 0 }`, `disableCollision(GROUP0, GROUP1)`). One step after each change, no body has `Asleep`.
  - `switching sleeping off wakes every sleeper`: `enabled = false`; after 1 step no body has `Asleep`.
- [x] **Step 2:** Run the tests. Expected: FAIL.
- [x] **Step 3:** Implement.
- [x] **Step 4:** Run the whole suite. Expected: PASS.
- [x] **Step 5:** READMEs; add to `engine-typescript/docs/ecs-guide.md` a "Sleeping" section: which tags and resource exist, that code changing a body's velocity, position or force calls `wakeBody`, and that destroying or moving bodies goes through `destroyBody`, `moveStaticBody` and `setCollisionGroup`. Replace any mention of the `Sleep` component and update the step order it describes. Lint, typecheck, build, test. Commit `feat: wake sleepers when the world changes without motion (#23)`.

### Task 7: Debug colour for sleepers

**Files:** Modify `src/rendering/DebugOptions.ts` (`sleeping: boolean`, default `true`), `src/rendering/ColliderRenderSystem.ts`, `src/rendering/README.md`. Test: `tests/rendering/rendering.test.ts`.

**Interfaces — Produces:** with `DebugOptions.sleeping` on, `ColliderRenderSystem` draws a body that has `Asleep` in `SLEEPING_COLOR = "rgb(160, 160, 160)"` instead of its `Renderable` colour. Without a `DebugOptionsResource`, it draws normally.

- [x] **Step 1: Failing tests:** a sleeping box is batched in `SLEEPING_COLOR`, an awake one in its own colour, and with `sleeping: false` the sleeper keeps its own colour. Follow how `rendering.test.ts` inspects `DrawBatches`.
- [x] **Step 2:** Run. Expected: FAIL.
- [x] **Step 3:** Implement.
- [x] **Step 4:** Run. Expected: PASS. README, lint, typecheck, build, test.
- [x] **Step 5:** Commit `feat: draw sleeping bodies in grey (#23)`.

### Task 8: Benchmark windows

**Files:** Modify `src/app/sceneSelection.ts`, `src/app/BenchmarkScene.ts`, `src/main.ts`, `tests/benchmark/physicsStep.bench.ts`, `src/app/README.md`, `engine-typescript/README.md` (Scenes: benchmark gains `&window=settled`). Test: `tests/app/app.test.ts`.

**Interfaces — Produces:**
- `type BenchmarkWindow = "collapse" | "settled"`, `selectBenchmarkWindow(search: string): BenchmarkWindow` (default `"collapse"`).
- `BENCHMARK_SETTLED_WARMUP_FRAMES: number` exported from `BenchmarkScene.ts`.
- `main.ts`: the benchmark's `FrameTimer` warm-up is 60 frames for `collapse` and `BENCHMARK_SETTLED_WARMUP_FRAMES` for `settled`, with 300 sample frames either way. The summary line names the window and the share of bodies asleep at the end of the sample.

- [x] **Step 1: Failing tests** (`app.test.ts`): `selectBenchmarkWindow("?scene=benchmark")` is `"collapse"`, `"?scene=benchmark&window=settled"` is `"settled"`, and an unknown value is `"collapse"`.
- [x] **Step 2:** Run. Expected: FAIL. Implement `selectBenchmarkWindow`. Run again. Expected: PASS.
- [x] **Step 3: Measure the settle time.** In the bench file, add a test `steps until the pyramid sleeps` that steps the benchmark world and logs the first step at which 95% of `SleepTimer` bodies are asleep. If 95% is never reached within 3,600 steps, log the best share and the step it was reached at. Set `BENCHMARK_SETTLED_WARMUP_FRAMES` to that step rounded up to the next 60, or to 1,800 if the pyramid never reaches 95%. Record the result here.
- [x] **Step 4:** Add a `per-system step times, settled` bench test: warm up `BENCHMARK_SETTLED_WARMUP_FRAMES` steps, then the same table as the existing per-system test, plus the asleep share. Wire `main.ts`.
- [x] **Step 5:** READMEs (Scenes section included); lint, typecheck, build, test. Commit `feat: add a settled benchmark window (#23)`.

**Task 8 measurement:** per-body sleeping never reaches 95% asleep within 3,600 steps (headless). Share asleep: step 600 33.0%, 1200 38.9%, 1800 38.3%, 2400 34.8%, 3000 43.0%, 3600 45.9%; best 58.3% at step 3205. Bodies keep waking and re-sleeping, so `BENCHMARK_SETTLED_WARMUP_FRAMES` is the 1,800 fallback. Part B (islands) and Task 13 (thresholds) revisit it.

### Task 9: Part A measurement and handoff checkpoint

- [x] **Step 1:** Run `npm run bench` twice. Record both per-system tables (collapse and settled) under "Part A results" below.
- [x] **Step 2 (moved to Task 13, done there):** Ask the owner to run `?scene=benchmark` and `?scene=benchmark&window=settled` in Brave and paste both console tables. Record them below. Also ask for a visual check of `?scene=demo`, `?scene=benchmark` and `?scene=sandbox`: sleepers turn grey and wake when hit, dragged or left without support.
- [x] **Step 3:** Write the handoff below: state, deviations from this plan, measured numbers, and the resume prompt. Commit `docs: record part A sleeping results and handoff (#23)`.

**Part A results:** headless, `npm run bench`, Node v24.14.1, two runs.

| Window | Update total ms | contactDetection | velocitySolve | broadPhase | sleep | Asleep after sample |
| --- | --- | --- | --- | --- | --- | --- |
| Collapse (steps 120–420) | 19.62 / 18.64 | 8.92 / 8.13 | 4.62 / 4.72 | 3.68 / 3.50 | 0.29 / 0.28 | 1.6% |
| Settled (after 1,800 steps) | 16.98 / 16.31 | 7.62 / 6.96 | 3.67 / 3.76 | 3.60 / 3.56 | 0.28 / 0.27 | 34.1% |

Whole-step bench: 59.7 / 59.3 steps per second at the collapse window. Per-body sleeping saves about 2.5 ms headless once settled, because only about a third of the pyramid sleeps at a time (Task 8). `contactDetection` in the collapse window is 8.1–8.9 ms against phase 1's 6.4–6.8 ms; either the extra `Asleep` lookups per pair or headless noise. Check it in Task 13.

#### Handoff: part A done, part B next

**State.** Tasks 1–8 are built and committed on `feature/sleeping`, with all four checks passing (224 tests). Don't redo them.

**Deviations (ledgered as rulings):**
- Task 2: the twenty-box stack drifted 2.47 px once the snap was removed; it was `test.fails` until Task 4, where sleeping freezes it at 0.037 px.
- Task 4: contact detection treats `Asleep` as immovable here rather than in Task 5.
- Task 5: only a disturbing body (no `SleepTimer`, or `sleepTime` 0) wakes a sleeper; otherwise touching bodies ping-pong. Recorded in the spec.
- Task 6: world-change tests keep one schedule; the ECS guide's step table and a new "Sleeping" section are updated.
- Task 9: browser numbers and the visual check are collected once, in Task 13, for the finished phase.

**Numbers:** see "Part A results".

**Resume prompt:**

> Part A of `superpowers/plans/2026-11-14-physics-performance-phase-2.md` (per-body sleeping, issue #23) is done on `feature/sleeping`; see its "Handoff: part A done, part B next". Continue with part B (islands), Task 10, using superpowers:subagent-driven-development.

---

## Part B: islands

### Task 10: Islands resource and the island system

**Files:**
- Create: `src/sleeping/UnionFind.ts`, `src/resources/Islands.ts`, `src/systems/IslandSystem.ts`
- Modify: `src/app/schedules.ts` (`"islands"` right after `"contactDetection"`), READMEs
- Test: create `tests/sleeping/islands.test.ts`

**Interfaces — Produces:**
- `class UnionFind { reset(size: number): void; find(index: number): number; union(a: number, b: number): void }` with path compression and union by size, on `Int32Array`s that grow when `reset` asks for more.
- `class Islands { begin(entityCapacity: number): void; addBody(entity: Entity): void; link(entityA: Entity, entityB: Entity): void; finish(): void; get count(): number; members(island: number): readonly Entity[]; islandOf(entity: Entity): number }` + `IslandsResource`. `link` ignores an entity that wasn't added. `islandOf` returns −1 for a body that wasn't added. Islands are numbered 0…count−1 after `finish`.
- `createIslandSystem(world: World): System` does nothing when `SleepSettings.enabled` is false. Otherwise it adds every `[Velocity, Mass]` body `without: [Asleep, Particle]` whose inverse mass is > 0, links the two bodies of each manifold in `ContactManifolds`, links the two ends of each `SpringJoint` and `ForceJoint`, then calls `finish`. Statics are never added, so they link nothing.

- [x] **Step 1: Failing tests** (`tests/sleeping/islands.test.ts`):
  - `UnionFind` unit cases: a chain 0–1–2 has one root, and 3 stays alone; `reset` to a larger size keeps working.
  - `a chain of touching bodies is one island`: three boxes in a row touching, no gravity, one step; all three share `islandOf`.
  - `two piles on one floor are two islands`: two 2-box stacks 200 px apart on one floor, after 60 steps; the piles have different islands and the floor has −1.
  - `a joint links two bodies that don't touch`: two boxes 100 px apart with a `SpringJoint`, gravity 0; same island after one step.
  - `bodies spawned mid-run join islands`: run 1 step, spawn two touching boxes, run 1 step; they share an island.
- [x] **Step 2:** Run. Expected: FAIL.
- [x] **Step 3:** Implement.
- [x] **Step 4:** Run the whole suite. Expected: PASS.
- [x] **Step 5:** READMEs; lint, typecheck, build, test. Commit `feat: build contact and joint islands each step (#23)`.

### Task 11: Sleep by island

**Files:** Modify `src/systems/SleepSystem.ts`, `src/systems/README.md`, the `ecs-guide.md` Sleeping section. Test: `tests/sleeping/islands.test.ts`, `tests/systems/sleeping.test.ts`.

**Interfaces — Consumes:** `IslandsResource` (Task 10), `fallAsleep` (Task 3).
**Produces:** the sleep system still updates every body's `sleepTime` as in Task 4, but no longer puts single bodies to sleep. For each island, if every member has a `SleepTimer`, has no `NeverSleep` and has `sleepTime ≥ timeout`, it calls `fallAsleep(world, members)`.

- [x] **Step 1: Failing tests:**
  - `a stack falls asleep together`: a 5-box stack; the step at which the first box gets `Asleep` is the step at which all five have it.
  - `a NeverSleep body keeps its pile awake`: a 3-box stack whose top box has `canSleep: false`; after 900 steps no box is asleep.
  - `touching one body wakes the whole sleeping stack at once`: a 5-box stack asleep; `wakeBody` on the top box and a flush wake all five.
  - `destroying the bottom of a sleeping stack wakes all of it in one step`: a 5-box stack; after `destroyBody(bottom)` and one step, none of the remaining four is asleep.
  - `a woken stack doesn't sag`: a sleeping 10-box stack (as in `stability.test.ts`). Record the top box's y, `wakeBody` it, step 60, then check the top box's y changed by under `WAKE_SAG = 0.5` px. If this fails, stop and ask the owner whether to keep sleeping islands' manifolds (spec, "Phase 2 decisions"); don't raise the bar.
  - Task 4's and Task 5's sleeping tests still pass. The resting box's island is the box alone.
- [x] **Step 2:** Run. Expected: FAIL.
- [x] **Step 3:** Implement.
- [x] **Step 4:** Run the whole suite. Expected: PASS. Record the measured sag here.
- [x] **Step 5:** READMEs and ecs-guide; lint, typecheck, build, test. Commit `feat: sleep and wake whole islands (#23)`.

**Task 11 measurement:** a woken ten-box stack moves its top box 0.353 px over 60 steps (bar 0.5), so warm starting across a wake isn't needed and sleeping islands keep only their members.

### Task 12 (optional): Solve contacts island by island

Keep only if measured to help (spec, "Solving per island").

**Files:** Modify `src/systems/IslandSystem.ts` (or a step in `src/resources/ContactManifolds.ts` that reorders manifolds by island), the matching README. Test: `tests/sleeping/islands.test.ts`.

- [ ] **Step 1:** Record `velocitySolve` from two `npm run bench` runs (collapse window) before the change.
- [ ] **Step 2:** Test: after reordering, every manifold's entity pair and accumulated impulses are the same set as before, and the solver results in `tests/collision/sequentialImpulse.test.ts` are unchanged.
- [ ] **Step 3:** After the island system runs, reorder the current manifolds so each island's manifolds are contiguous. Warm-start matching is by pair key, so the order doesn't affect it.
- [ ] **Step 4:** Re-measure. Keep it if `velocitySolve` drops by more than the spread between the two runs; otherwise revert. Record the numbers and the outcome here, and commit `perf: solve contacts island by island (#23)` or `docs: record per-island solve trial (#23)`.

**Task 12 outcome:** not tried. With islands, 1,999 of the benchmark's 2,000 bodies form one island at every check (steps 600–1,800), so grouping manifolds by island leaves their order essentially unchanged and can't improve locality.

### Task 13: Tune, measure and close phase 2

- [x] **Step 1: Tune `SleepSettings` on the settled pyramid.** Re-run Task 8's settle-time test. If the pyramid doesn't reach 95% asleep, raise `linearThreshold` and `angularThreshold` in steps of 2× (up to 4 px/s and 0.14 rad/s) until it does or the limit is reached, and check after each step that the stability suite and the sleeping tests still pass. Record each try. Update `createSleepSettings`, the spec's values and `BENCHMARK_SETTLED_WARMUP_FRAMES` if they change.
- [x] **Step 2:** Run `npm run bench` twice and ask the owner for both browser windows and the visual check (as in Task 9). Fill in the spec's Results row 2 and add a "Phase 2 split" next to "Phase 1 split", with both windows. Check them against the targets: settled pyramid under 8 ms, collapse under 16.7 ms.
- [x] **Step 3:** Set the spec's Phase 2 Status to done, and add "Handoff: phase 2 done, phase 3 next" with a resume prompt for phase 3 (#24), in the same style as the phase 1 handoff.
- [x] **Step 4:** Lint, typecheck, build, test. Commit `docs: record phase 2 results and mark it done (#23)`.

**Task 13 measurement (headless, two `npm run bench` runs):**

Pyramid sleep with islands: best 0.1% asleep within 3,600 steps at the default thresholds, 0.1% at 2 px/s / 0.07 rad/s and 0.1% at 4 px/s / 0.14 rad/s, so the defaults stay. The pyramid is one island of 1,999–2,000 bodies. At any moment a few bodies in the bottom rows jitter at 1–7 px/s and 0.15–0.57 rad/s while their positions stay within 0.1 px: contact jitter that 8 velocity passes don't remove, not real motion. One restless body keeps the whole island awake. (Superseded by the owner's review below: the cause is the split-impulse pass, not too few velocity passes.)

| Window | Update total ms | contactDetection | velocitySolve | broadPhase | islands | sleep | Asleep |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Collapse (steps 120–420) | 18.64 / 20.00 | 7.98 / 8.73 | 4.35 / 4.45 | 3.34 / 3.61 | 0.76 / 0.85 | 0.27 / 0.30 | 0.0% |
| Settled (after 1,800 steps) | 19.26 / 22.17 | 8.28 / 9.95 | 4.62 / 5.00 | 3.30 / 3.74 | 0.79 / 0.93 | 0.26 / 0.31 | 0.1% |

Phase 1's headless total was 16.26 / 17.35 ms. On the benchmark, phase 2 adds the `islands` and `sleep` systems (about 1.1 ms headless) and saves nothing, because nothing sleeps. Separate piles (demo, tests) do sleep. Steps 2–4 wait on the owner: browser numbers, the visual check, and a decision on the benchmark result.

**Task 13 outcome (after the owner's review):**

- **Benchmark changes (owner's decisions):** the benchmark pyramid is all 12×12 boxes, and `pyramid=standing` adds 210 30×30 crates standing on the floor. The demo gets a three-crate stack for checking waking by hand.
- **Fix from the visual check:** the player's first hit didn't knock the demo crates over, because contact detection treated the sleeper as immovable for the waking step. Sleepers touched by a disturbing body now wake before any manifold is built (`wakeBodyNow`). Tests "a hit pushes a sleeper as hard as an awake body" and the demo crate test, both RED→GREEN.
- **Why the falling pile never sleeps:** the split-impulse pass pushes deep contacts apart sideways, so the pile creeps outward. Switching it off made the pile sleep fully; 16 velocity passes, β 0.1 and a 1 px slop didn't help. The owner moved the fix to phase 3's first item.
- **Numbers:** one headless run instead of two (the browser split is the reference). See the spec's Results row 2 and "Phase 2 split".
