# Physics performance: design

Issue: #20. Branch: `feature/physics-performance` from `dev`. Status: draft. The owner wants it written down now and will talk through each part before any of it is planned or built, so the decisions marked **Open** below are still theirs to make.

## Intent

The ECS refactor (PR #12) made the engine about 3.9× faster, but the 2,000-body benchmark still misses a 60 FPS frame by a wide margin. The run recorded in `superpowers/plans/2026-11-13-ecs-handoff.md` (Brave, `?scene=benchmark`) measured:

| Stage | Time per frame |
| --- | --- |
| Update (physics) | 46.25 ms |
| Render | 1.74 ms, 6 draw calls |
| Frame budget at 60 FPS | 16.7 ms |

Rendering is about 4% of the frame, so renderer work (sprites #18, WebGL #19) can't fix the frame rate. Physics has to get about 3× faster just to fit the budget. This spec lists the changes that get there, in the order to do them, and how each one is measured.

## Goals

- The 2,000-body benchmark's update step fits the frame budget: **under 16.7 ms**, with a stretch target of **under 8 ms** so rendering, input and the browser have room.
- Stacks stay at least as stable as now: the benchmark pyramid settles and stays standing, and the demo scene behaves the same to the eye.
- Every change is measured. Per-system timings are recorded before and after each phase, in this spec's results table or the plan that implements it.

## Non-goals

- Renderer changes. Those are #18 and #19.
- New physics features such as continuous collision detection, new shapes or new joint types. They are only mentioned where a change here makes them easier or harder.
- 3D.
- Multithreading, WASM and GPU compute. They are listed under Later and are out of scope until phases 1–4 are done and measured.

## Anti-goals

- Optimising without numbers. No phase starts until phase 0's per-system timings exist, and no phase counts as done without a before/after measurement.
- Trading stability for speed without saying so. If fewer solver iterations make stacks jitter or sink, that is a regression even if the benchmark gets faster.
- Micro-optimising code that a later phase deletes. Phase 4 comes after phase 1 for this reason.

## How the step works today

The update schedule (`src/app/schedules.ts`) runs, in order: player input, mouse drag, intent forces, gravity, wind, joint forces, rigid-body integration, particle integration, collider transforms, broad phase, collision solver.

What matters for performance, from reading the code:

1. **The solver re-runs the narrow phase 25 times per step.** `CollisionSolverSystem.ts` loops `SOLVER_ITERATIONS = 25` times over every candidate pair. Each pass calls `solvePair`, which does the AABB test, the full `testCollision` (SAT for polygons), `correctPositions` (moves both bodies and their world vertices) and `resolveImpulse`. Because positions move on every pass, the narrow phase has to be redone each time. That means about 25 SAT tests per touching pair per step, which is very likely where most of the 46 ms goes.
2. **Each pair gets one contact point.** `narrowPhase.ts` returns only the single deepest point. A box resting flat on another has two real contact points, so with one point it rocks between corners. That rocking is part of why so many iterations are needed.
3. **Restitution is applied on every iteration.** `resolveImpulse` uses `-(restitution + 1) × relative velocity` each pass, so bounce is reapplied up to 25 times instead of once per collision.
4. **Sleeping doesn't skip work.** The `Sleep` component only holds thresholds. `RigidBodyIntegrationSystem` snaps velocities under the threshold to zero, but the body is still integrated, re-transformed, inserted into the grid, paired and solved every step. A settled pyramid does the same work as a falling one.
5. **The broad phase rebuilds everything each step.** `BroadPhaseSystem` clears the hash grid (cell size 20, set in `DemoScene.ts`) and re-inserts every collider, including static walls that never move and span many cells. Pairs where both bodies are static are only thrown away later in the solver, after the AABB test, 25 times.
6. **Collider transforms run for every body every step**, moving or not (`ColliderTransformSystem.ts`). Rotation work is skipped when the angle is unchanged, but translation is not.
7. **Hot loops look up slots by entity.** `solvePair`, `correctPositions` and `resolveImpulse` call `slotOf` for transforms, colliders, masses, velocities and materials on every call, and those calls run 25 times per pair.

### Found while reading (correctness)

These aren't performance problems, but the solver rewrite touches the same code, so they belong in the same plan or in their own bug issues first:

- **Restitution can be NaN.** Restitution is combined as `2ab / (a + b)`, so two materials with restitution 0 give `0 / 0 = NaN`. This is similar to #13.
- **Friction direction check ignores negative tangents.** `if (tangentX > TANGENT_THRESHOLD || tangentY > TANGENT_THRESHOLD)` is false when both components are negative, so the tangent is never normalised and the friction impulse is scaled by its raw length. It should test the tangent's length.
- **Friction isn't clamped by the friction coefficient.** Coulomb friction limits the friction impulse to `μ × normal impulse`, in both directions. The code clamps to `linearImpulse` and only from above.

## The improvements

Phases are ordered by expected gain and by what each one depends on. Every phase ends with lint, typecheck, build and tests passing, the benchmark re-run, and the numbers recorded.

### Phase 0: measure per system

**What:** time each system in the update schedule, not just the update as a whole.

**How:**
- Give `Schedule` an optional timing hook, or wrap each system in the benchmark build, that adds `performance.now()` deltas per system name into a per-frame record. The physics layer can't use browser globals, so the clock is passed in from the app layer.
- Extend `FrameTimer` to average per-system times over the same warm-up and sample window, and show the top systems under the benchmark's FPS line.
- Extend `tests/benchmark/physicsStep.bench.ts` (`npm run bench`) to report per-system times headlessly, so results don't depend on one browser run.

**Done when:** the benchmark shows how the 46 ms splits across systems, and that split is recorded below as the baseline.

**Risk:** almost none. Timing overhead is tiny compared with the systems being timed.

### Phase 1: cached contacts and a sequential-impulse solver (largest gain)

**What:** run the narrow phase once per step, then iterate on velocities only using the stored contacts. This is how Box2D, Box2D-Lite and most game physics engines solve contacts.

**How:**
1. **Contact manifold.** After the broad phase, run `testCollision` once per candidate pair and store the result in a contact store resource: entity pair, normal, and for each contact point its depth and offset from each body's centre. Polygon–polygon contacts get up to **two points** by clipping the incident edge against the reference edge (the Sutherland–Hodgman clip Box2D uses). Circle contacts keep one point.
2. **Pre-step, once per contact point:** compute the effective mass along the normal and the tangent, the restitution target from the velocity *before* solving (so bounce is applied once), and the position-correction bias.
3. **Velocity iterations.** For N iterations (starting at about 8; **Open**), apply normal and friction impulses per contact point. Use **accumulated impulses**: clamp the running total so the normal impulse is never negative and friction stays within `μ × normal`, then apply only the change. This is what makes few iterations converge.
4. **Position correction.** Replace moving bodies on every pass with one of these (**Open**):
   - **Baumgarte bias:** add `β × max(depth − slop, 0) / dt` to the normal velocity target. It's simple, but it adds a little energy.
   - **Split impulses / pseudo-velocities:** a separate correction velocity that changes position but not momentum. It's more stable for stacks and is what Box2D v2.x moved to.
   - **A separate position pass:** a few iterations of direct position correction after the velocity solve, without redoing the narrow phase. This is closest to today's behaviour.
5. **Warm starting.** Give each contact point a feature ID (which edge and which vertex made it) and keep last step's accumulated impulses by pair and feature. At the start of the step, apply those impulses first. Stacks then start near the solution and settle in far fewer iterations.
6. **Recording.** `ContactLog` and the friction arrows read from the manifold directly, rather than from iteration 0.
7. **Block solver for two-point manifolds (optional, try after the rest works).** The sequential solver handles a manifold's two points one after the other, so they fight: fixing the left corner tilts the box onto the right one. Box2D's block solver solves both normal impulses together as one 2×2 problem. With the "impulse ≥ 0" rule it has only 4 cases (both touching, only one touching, neither), so it can test each directly. Boxes resting flat settle with less rocking and fewer passes. Keep it only if the stack tests show a gain. Friction stays sequential.
8. **Contact storage ready for parallel solving later.** Store manifolds and contact points in flat typed-array columns (as the ECS stores components), keep each body's velocity in exactly one place, and keep the per-contact solve free of shared mutable state other than the two bodies' velocities. That costs nothing now and lets graph colouring and Web Workers be added later without rewriting the solver (see Later).
9. **Step order: split integration.** Today `RigidBodyIntegrationSystem` updates velocity *and* position before collision runs, so bodies move into each other first and the solver repairs the overlap afterwards. The sequential-impulse solver works best in the Box2D order, where contacts fix velocities *before* anything moves:

   ```
   forces (gravity, wind, joints, input)
   velocity integration      velocity += force × inverseMass × dt; damping
   collider transforms
   broad phase
   contact detection         narrow phase once, store manifolds
   velocity solve            warm start, then N passes over stored contacts
   position integration      position += velocity × dt; angle += angular × dt
   position correction       remove any overlap left
   sleep update              sleep thresholds and timers (phase 2)
   ```

   This splits `RigidBodyIntegrationSystem` into a velocity integration system and a position integration system, with the collision systems between them. Particles (`ParticleIntegrationSystem`) can keep integrating in one go, because they don't collide. Collider world vertices are recomputed from the transforms before detection, so they match the positions the contacts are measured at. Position integration moves bodies after detection, so the debug contact points drawn that frame are from the start of the step. (**Open**: split, or keep today's order and lean harder on position correction. Recommended: split.)

**Why iterate rather than solve each group exactly:** resolving a group of touching contacts at once means solving a linear complementarity problem (LCP): every contact either pushes with zero relative velocity, or separates with zero impulse. Direct LCP solvers cost roughly the cube of the number of contacts and get unreliable with friction, and a settled pyramid is one group with thousands of contacts. Sequential impulses with accumulated, clamped impulses is projected Gauss–Seidel, the standard iterative method for this problem, used by Box2D, Bullet, PhysX and Rapier. Exact solves are kept for tiny blocks only (step 7). The owner chose iteration.

**Expected gain:** the narrow phase goes from about 25× per pair to 1×, and each iteration becomes a few multiply-adds per contact point. I'd expect the solver to get roughly 5–20× faster. That is an estimate to confirm with phase 0's numbers.

**Risk:** it changes behaviour. Bounces, friction and stacking will feel different. Restitution applied once means things bounce less than now, which is the correct behaviour. Covered by the tests in "Testing" below and a side-by-side visual check against `dev`.

**Fixes along the way:** the three correctness issues above. The new effective-mass and clamping code replaces the lines that have them.

### Phase 2: real sleeping

**What:** bodies that stay still are taken out of the step until something disturbs them.

**Design: tags for eligibility and state, a resource for settings, one component for the timer.** (The owner chose this over making "has a `Sleep` component" the rule for which bodies can sleep.)

| Piece | Kind | Purpose |
| --- | --- | --- |
| `NeverSleep` | tag (`{}`) | This body may never sleep: the player, script-driven bodies such as moving platforms, fast projectiles, and bodies under constant small forces |
| `Asleep` | tag (`{}`) | This body is asleep. Active systems exclude it with `without: [Asleep]` |
| `SleepTimer` | component, `{ sleepTime: "f64" }` | Seconds this body has stayed below the thresholds. Replaces today's `Sleep` component |
| `SleepSettings` | resource | `enabled` (world-wide switch, for debugging), `linearThreshold`, `angularThreshold`, `timeout` (about 0.5 s) |

**Rules:**

- **Opt out, not in.** Most bodies should sleep, so the few that shouldn't get `NeverSleep`. `spawnDynamicBody` gets a `canSleep` option (default `true`); `false` adds `NeverSleep`. The demo spawns the player with `canSleep: false`.
- **Which bodies can sleep:** dynamic bodies with `SleepTimer` and without `NeverSleep`, while `SleepSettings.enabled` is true. Static bodies never get a timer.
- **Integration stops requiring a sleep component.** Today `RigidBodyIntegrationSystem`'s view includes `Sleep`, so a dynamic body without it isn't integrated at all. The new velocity and position integration views require `[Transform, Velocity, ForceAccumulator, Mass, LinearDamping]` and exclude `Asleep` and `Particle`.
- **Thresholds move to the resource.** Per-body thresholds are dropped until something needs them. The per-step "snap small velocities to zero" in today's integration is removed; zeroing velocity happens once, when a body falls asleep. This is a behaviour change: slow drift that is snapped to zero today becomes real motion until the body sleeps.

**Systems:**

- **Sleep update system**, last in the update schedule (after position correction). For each `[SleepTimer, Velocity]` body without `NeverSleep` or `Asleep`: if linear and angular speed are below the thresholds, add `deltaTime` to `sleepTime`, otherwise reset it to 0. When `sleepTime ≥ timeout`, defer: zero the velocity, clear the force accumulator, add `Asleep`.
- **Systems that skip sleepers** (`without: [Asleep]`): gravity, wind, joint forces, velocity integration, position integration, collider transforms and the sleep update. A sleeping body doesn't move, so its world vertices and bounds stay valid.
- **The broad phase still inserts sleepers**, so awake bodies can find them. Pairs where neither body can move (static or asleep) aren't emitted (phase 3).
- **The solver treats a sleeper as immovable** for the current step (inverse mass and inertia 0 in that contact) and defers waking it. It moves from the next step, which is invisible at 60 steps a second.

**Waking** removes `Asleep` and resets `sleepTime` to 0, through one helper, `wakeBody(world, entity)`, that defers the change. It's called when:

- an awake dynamic body has a contact with a sleeper (solver);
- a joint attached to a sleeper applies force (joint force system);
- the mouse drag grabs a body (`MouseDragSystem`);
- code sets a sleeper's velocity, position or force directly. Those call sites call `wakeBody` themselves.

**Waking without motion.** The broad phase drops pairs where neither body can move (phase 3), so a sleeper is only woken by contact when an *awake* body reaches it. These changes don't involve any awake body, so each needs its own wake rule:

- **A body is destroyed.** Wake every body it had a contact with in the last step, found through phase 1's stored contacts (the ones kept for warm starting). Otherwise removing the bottom crate of a sleeping stack leaves the rest floating. If the destroyed body has joints, wake the bodies on the other end too.
- **A static body is moved by code.** Moving platforms, elevators and other script-driven bodies aren't static. They're dynamic or kinematic bodies with `NeverSleep`, so an awake body moving through sleepers creates pairs and wakes them. If code still moves a static body, it calls a helper that wakes every body whose bounds overlap the static body's old or new bounds.
- **World settings change.** Changing the gravity or wind resource wakes every sleeper. It's rare, so waking everything is fine.
- **Collision rules change.** Changing the collision matrix (`CollisionSettings`) or a body's `CollisionGroup` wakes every sleeper, or for a group change, the bodies overlapping that body. Two sleepers that are newly allowed to collide may already overlap.

Bodies under constant non-gravity forces, such as wind, get `NeverSleep`. Otherwise wind would stop affecting them once they sleep, because force systems skip sleepers.

**Deferral (`world.defer`):** adding and removing `Asleep` are structural changes, so they're always deferred and applied when the queuing system finishes (`Schedule.run` flushes after every system). Commands capture entity IDs, never slots, and check `world.isAlive(entity)` before changing anything. Waking an island queues one command per body, or one command that wakes them all. Commands queued while flushing run in the same flush.

**Cost of `without`:** views are uncached, so a sleeping body still costs one store lookup per system per step, but none of the physics work. If that lookup ever shows up in phase 0's timings, a cached view or group (see `src/ecs/README.md`) removes it.

**Islands (second step):** group bodies connected by contacts and joints, and sleep or wake a whole group together. Without islands, a body at the bottom of a stack can fall asleep while the bodies on top still push on it, so the stack sinks or jitters. An island sleeps only when every body in it can sleep and has stayed still for the timeout. One `NeverSleep` body, such as the player standing on a pile of crates, keeps its whole island awake. Islands also give phase 1's solver a natural unit of work.

- **What an island is:** the bodies linked by a chain of contacts or joints. Bodies don't all have to touch each other: if A touches B and B touches C, then A, B and C are one island. Static bodies don't link islands, so two piles on the same floor are two islands.
- **Building them:** each step after contact detection, use union-find over dynamic bodies. Start with every body in its own set, merge the two sets for each contact and joint, and skip static bodies. This is close to linear in the number of contacts. Islands split by themselves when a pile breaks apart, because they're rebuilt every step.
- **Solving per island:** the velocity solve runs island by island, iterating over each island's contacts (phase 1). The result is the same as solving all contacts mixed together, because islands don't affect each other, but the data each island touches stays together in memory.
- **To try, keep only if measured to help:**
  - *Iteration count per island.* A lone body needs 1–2 passes and a tall stack 8 or more. Stop an island early once its corrections fall below a tolerance.
  - *Bottom-up order.* Solve each island's contacts in order of distance from static bodies, counted in contacts (floor contacts first), so support passes upward each pass. Warm starting may already make this unnecessary.
- **Big islands are expected.** Fifty crates in one pile are one island, and the 2,000-body benchmark pyramid is almost certainly a single island. Solver cost doesn't change (it's contacts × passes either way), but:
  - one restless body keeps the whole island awake, and touching any body wakes all of it. That's the price of stable stacks, and the main lever against it is the thresholds in `SleepSettings`;
  - the island needs enough passes for its hardest part;
  - a single island can't be split across Web Workers. That needs graph colouring (see Later).

**Debug draw:** an option in `DebugOptions` to colour sleeping bodies differently.

**Expected gain:** once the benchmark pyramid settles, nearly every body is asleep, so a step costs a fraction of today's. Benchmarks that only measure a settled scene will look much better than a falling one, so measure both (see "Measuring").

**Risk:** bodies that sleep in mid-air or never wake. It needs tests for waking on contact, joint, drag and direct velocity changes.

### Phase 3: broad-phase trimming

**What:** produce fewer candidate pairs, and do less work per step to produce them.

**How:**
- **Skip static and sleeping pairs:** emit a pair only if **at least one body is awake and dynamic**. The check runs once per step in the broad phase instead of 25 times in the solver. Sleepers stay in the grid, so awake bodies still find them.

  | Body A | Body B | Emitted | Why |
  | --- | --- | --- | --- |
  | awake | awake | yes | normal contact |
  | awake | asleep | yes | the wake path: the solver resolves it and wakes the sleeper |
  | awake | static | yes | e.g. landing on the floor |
  | asleep | asleep | no | neither has moved since sleeping |
  | asleep | static | no | the sleeper rests on it and neither moves |
  | static | static | no | static bodies never move |

  Anything that changes the world without motion (destroying a body, moving a static body, changing gravity, wind or collision rules) is handled by phase 2's "waking without motion" rules, not by the broad phase.
- **Separate static grid:** insert static bodies such as the walls once, into their own grid. Each step, only moving bodies are re-inserted, and each is checked against both grids.
- **Cell size:** benchmark bodies are 12 px wide (circle radius 6, box size 12) and cells are 20 px. Tune with phase 0's timings. Too small and each body covers many cells; too large and each cell holds many bodies.
- **Pair slots:** store each pair's collider, transform, mass, velocity and material slots in `CandidatePairs`, so the solver doesn't call `slotOf` in its loops (item 7 above).
- **Alternative to evaluate, not adopt:** sweep-and-prune (sort bounds along one axis) or a dynamic AABB tree. Only worth trying if the broad phase is still a large share of the time after phases 1–2.

**Expected gain:** smaller than phases 1–2, but it scales with body count.

**Risk:** low. Candidate pairs must stay the same apart from the ones deliberately skipped, so a test should compare pair sets before and after.

### Phase 4: narrow-phase and transform work

**What:** smaller wins in code that phase 1 has already cut down to one call per pair.

**How:** five independent items. Each can be done, measured and merged on its own.

1. **Skip colliders that didn't change.** `ColliderTransformSystem` calls `transformCollider` (`src/shapes/colliderGeometry.ts`) for every body every step. For a polygon that means `cos` and `sin`, rotating every vertex and rebuilding the bounds, even for bodies that never move.
   - **Static bodies:** transform once at spawn and exclude them from the transform view (for example `without` a static marker, or requiring `Velocity`). Phase 2's helper for moving a static body re-transforms it when that happens. This is the most certain item, because the walls are re-transformed every step for nothing today.
   - **Sleepers:** already skipped by phase 2 (`without: [Asleep]`).
   - **Translated only (angle unchanged):** shift the vertices and bounds by the offset, as `translateCollider` already does, without `cos`/`sin` or rotation.
   - **Not moved at all:** compare position and angle with last step's and skip. Rare for awake bodies, so the lowest priority.
2. **Rotate stored local normals instead of recomputing them.** When the angle changes, `computeNormals` rebuilds every edge normal from the world vertices: a subtraction, a `Math.hypot` and two divisions per edge. Normals only rotate with the body. Store each polygon's local normals once at spawn, a new `localNormals` collider field built by the same code from the local vertices. Rotate them with the `cos` and `sin` already computed for the vertices: 4 multiplies and 2 adds per normal, with no square root or division.
3. **Remove the per-test edge maths in circle vs polygon.** `circleVsPolygonEdges` recomputes each edge's direction and length with `Math.hypot` and two divisions on every test. Neither needs computing:
   - **Direction:** `computeNormals` sets `normal = (dirY, −dirX)`, so the edge direction is `(−normalY, normalX)`, read from the stored world normals.
   - **Length:** rotation and translation never change an edge's length, so store each polygon's edge lengths once at spawn (a new `edgeLengths` collider field).

   The benchmark is a pyramid of circles and boxes, so circle–polygon tests are common.
4. **Cache the separating axis per pair.** SAT exits as soon as an edge separates the shapes (`deepestContact` returns `false` when no vertex lies behind the edge), but in the worst case it tries every edge of both polygons first (up to 8 edge tests for two boxes, each against 4 vertices). Neighbouring bodies rarely change arrangement between steps, so store per pair which polygon and edge separated them last step, and test that edge first. If it still separates, the test ends after 1 edge instead of up to 8. For touching pairs, store the reference edge instead. Phase 1's clipping starts from it, and it's part of the contact's feature ID for warm starting. It lives in the same per-pair store phase 1 adds, keyed by the entity pair. It mostly helps pairs that are near but not touching, so measure it before keeping it.
5. **`Math.hypot` → `Math.sqrt(x * x + y * y)` in hot paths.** V8's `Math.hypot` guards against overflow and underflow that engine-scale numbers never reach, and it is noticeably slower. Items 2 and 3 remove the calls in collider transforms and the narrow phase. Switch the rest that run per contact or per step, such as friction tangent normalisation in the solver and joint lengths, and leave one-off uses (shape construction) alone.

**Why last:** phase 1 cuts narrow-phase calls from about 25 per pair to 1, so the same saving is worth about 1/25 of what it would be today. Phase 2 removes sleepers and phase 3 removes static pairs from what reaches the narrow phase and transforms. Optimising this code earlier would mean polishing work that is about to shrink.

**Expected gain:** small. Items 1 (statics), 2 and 3 are cheap and low-risk, so they can be done whenever convenient. Item 4 only if phase 0's numbers show the narrow phase still matters after phases 1–3.

**Risk:** low. Items 2 and 3 must give the same normals, contacts and depths as today (within floating-point tolerance), and item 1 must give the same bounds and world vertices. Tests compare old and new results on rotated and translated shapes.

### Later (out of scope)

Only if phases 1–4 aren't enough:

- **Web Workers and graph colouring (parallel solving).** Not part of this spec's phases. When it comes to planning and implementation, open a separate issue for it and write its own spec and plan. Notes for that work:
  - **Why islands alone aren't enough:** islands are independent, so separate islands can run on separate workers. But the benchmark pyramid is one island, so splitting by island would give one worker all the work.
  - **Graph colouring:** treat bodies as nodes and contacts as edges. Colour the contacts so that no two contacts sharing a dynamic body have the same colour. Statics don't count, because their velocity is never written, so all floor contacts can share a colour. Within one colour, no contacts share a body, so they can be solved in parallel without races. Each pass solves the colours one after another, with a barrier between colours. Assign colours greedily each step: pick the lowest colour not used by either body, tracked as a bitmask per body. Cap the number of colours (Box2D v3 uses about 24) and solve any overflow contacts on one thread. A tight cluster (three bodies all touching each other) needs one colour per contact and gains nothing. A packed pyramid needs about 6–8 colours with hundreds of contacts each. Colouring changes the solve order, so results differ slightly from the single-threaded order, but they stay deterministic if the colouring is.
  - **Order to try it in:** colouring single-threaded first (testable, proves stability holds), then shared memory, then the worker pool.
  - **Shared memory:** `postMessage` copies data and is far too slow for about 50+ barriers per step (passes × colours). Workers need `SharedArrayBuffer` with `Atomics.wait`/`Atomics.notify` barriers. ECS columns are replaced when they grow (`src/ecs/README.md`), so they'd need `SharedArrayBuffer` backing and a way to hand new buffers to workers. That's a change to the ECS core.
  - **Cross-origin isolation:** `SharedArrayBuffer` requires `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers on Vite's dev server and any host.
  - **Physics stays browser-free:** worker creation lives in app. The physics layer only sees the shared columns and a solve function per colour.
  - Phase 1 step 8 keeps contact storage ready for this.
- **WASM:** compile the solver and narrow phase from Rust, C or AssemblyScript. It helps most with tight numeric loops. Copying data between JS and WASM can eat the gain unless the columns live in WASM memory.
- **GPU compute (WebGPU):** for very large body counts, particles or cloth. It's a separate architecture and only makes sense together with #19.

## Order and dependencies

```
Phase 0 (measure)
  └─ Phase 1 (cached contacts, sequential impulses, warm starting)
       ├─ Phase 2 (sleeping, then islands)
       └─ Phase 3 (broad-phase trimming)      can run in parallel with phase 2
            └─ Phase 4 (narrow-phase details)  only if numbers still call for it
```

Each phase is its own issue, branch and pull request, so its benchmark change can be seen on its own.

## Measuring

- **Browser:** `?scene=benchmark` gives update ms, render ms and draw calls, and per-system ms after phase 0. Use the same browser and machine for before and after, and note them.
- **Headless:** `npm run bench` (`tests/benchmark/physicsStep.bench.ts`) for numbers that don't depend on the browser.
- **Two moments:** the benchmark samples a fixed window after 60 warm-up frames. Once sleeping exists, also measure a window during the pyramid's collapse (heavy contact, nothing asleep), so sleeping doesn't hide a slow solver.

### Results

| Phase | Browser update ms | Headless step ms | Solver ms | Broad phase ms | Notes |
| --- | --- | --- | --- | --- | --- |
| Baseline (ECS, PR #12) | 46.25 | | | | Brave, 2,000 bodies. Per-system numbers come from phase 0 |
| 0 | | | | | |
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |

## Testing

Speed-ups in a solver are easy to get by quietly breaking it, so phase 1 adds tests first:

- **Resting contact:** a box on the ground settles and stays within a small depth of the surface after N seconds, without drifting or sinking.
- **Stack:** a column of boxes (e.g. 10) stays standing for N seconds, and the top box's sideways drift stays under a tolerance.
- **Pyramid:** the benchmark pyramid, or a smaller one, stays standing after settling.
- **Restitution:** a ball dropped with restitution r reaches about r² of its drop height. Restitution 0 doesn't bounce and doesn't produce NaN.
- **Friction:** a box on a slope steeper than `atan(μ)` slides, and one on a shallower slope doesn't. That covers the negative-tangent and clamp fixes.
- **Momentum:** two bodies colliding in empty space conserve linear momentum within a tolerance.
- **Sleeping (phase 2):** a body falls asleep after the timeout and wakes on contact, joint force, mouse drag and a direct velocity change. A body with `NeverSleep` never gets `Asleep`. A dynamic body without `SleepTimer` is still integrated. With `SleepSettings.enabled` false, nothing sleeps. A sleeper touched by a `NeverSleep` body wakes. With islands, a pile touching a `NeverSleep` body stays awake.
- **Waking without motion (phase 2):** destroying the bottom body of a sleeping stack makes the bodies above wake and fall; destroying a jointed body wakes the body on the other end; moving a static body through the helper wakes the sleepers it overlapped; changing gravity, wind or the collision matrix wakes every sleeper.
- **Broad phase (phase 3):** pairs before and after are the same, apart from pairs where neither body is awake and dynamic. An awake body overlapping a sleeper still produces a pair.

The existing tests in `tests/collision/` and `tests/systems/collision.test.ts` will need updating where they assert today's exact numbers, such as positional correction at 90% of depth per pass.

## Docs to update

Under AGENTS.md rules 3 and 4, each phase updates in the same change:

- The READMEs of every folder whose files change: `src/systems/`, `src/collisionDetectionSystem/`, `src/optimizations/broadPhase/`, `src/resources/`, `src/components/`, `src/app/`, `tests/...`.
- `engine-typescript/docs/ecs-guide.md` wherever the update order, the solver or the `Sleep` component is described.
- The Scenes section of `engine-typescript/README.md` if the benchmark's on-screen output changes (per-system times).

## Open decisions (to talk through)

1. **Position correction:** Baumgarte bias, split impulses, or a separate position pass (phase 1, step 4).
2. **Step order:** split rigid-body integration into velocity and position halves around the collision systems (phase 1, step 9), or keep today's order? Recommended: split.
3. **Iteration count:** start at 8 velocity iterations, or tune from tests and benchmarks?
4. **Behaviour change:** is it fine for bounces and stacks to feel different, given restitution will be applied once instead of up to 25 times? If not, which current behaviour should be kept?
5. **Sleeping representation:** decided: `NeverSleep` and `Asleep` tags, a `SleepTimer` component and a `SleepSettings` resource (phase 2).
6. **Sleep timeout:** about 0.5 s in `SleepSettings`. Is a world-wide value enough, or does anything need its own?
7. **Islands:** decided: part of phase 2, as the grouping for sleeping and solving, with iteration inside each island. Parallel solving (Web Workers, graph colouring) is a separate issue later.
8. **Correctness fixes:** fix the restitution NaN, friction direction and friction clamp as separate bug issues first, or inside phase 1?
9. **Targets:** is under 16.7 ms enough, or is under 8 ms the real goal?

## References

- Erin Catto, "Iterative Dynamics with Temporal Coherence" (GDC 2005) and "Fast and Simple Physics using Sequential Impulses" (GDC 2006): accumulated impulses, warm starting and Box2D-Lite.
- Box2D-Lite source: a small, readable 2D sequential-impulse solver with clipping and warm starting.
- Ian Millington, *Game Physics Engine Development*: contact generation, the resolution order and sleeping (the book this engine follows).
- *3D Math Primer for Graphics and Game Development*, 2nd edition, chapter 12: the impulse maths `resolveImpulse` already follows.
