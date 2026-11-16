# Physics performance: design

Issue: #20, with one sub-issue per phase (#21–#25). This spec was written on `feature/physics-performance` and merged into `dev` on its own. Each phase is planned in its own session, in its own `superpowers/plans/` file, just before it is built. Status: draft. Decisions marked **Open** below are still the owner's to make, and each is settled when its phase is planned.

## Intent

The ECS refactor (PR #12) made the engine about 3.9× faster, but the 2,000-body benchmark still misses a 60 FPS frame by a wide margin. The run recorded in `superpowers/plans/2026-11-13-ecs-handoff.md` (Brave, `?scene=benchmark`) measured:

| Stage                  | Time per frame        |
| ---------------------- | --------------------- |
| Update (physics)       | 46.25 ms              |
| Render                 | 1.74 ms, 6 draw calls |
| Frame budget at 60 FPS | 16.7 ms               |

Rendering is about 4% of the frame, so renderer work (sprites #18, WebGL #19) can't fix the frame rate. Physics has to get about 3× faster just to fit the budget. This spec lists the changes that get there, in the order to do them, and how each one is measured.

## Goals

- The 2,000-body benchmark's update step fits the frame budget: **under 16.7 ms** after phase 1. After phases 1–3, **under 8 ms** for the settled pyramid, so rendering, input and the browser have room, and **under 16.7 ms** during the pyramid's collapse.
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
- **Friction is scaled by the bounce factor.** The friction impulse is multiplied by `(restitution + 1)` (`contactResolution.ts`), so bouncier materials get more friction.

## The improvements

Phases are ordered by expected gain and by what each one depends on. Every phase ends with lint, typecheck, build and tests passing, the benchmark re-run, and the numbers recorded.

### Phase 0: measure per system

**Status:** done. Plan: `superpowers/plans/2026-11-13-physics-performance-phase-0.md`. Issue #21. The baseline split is under Results.

**What:** time each system in the update schedule, not just the update as a whole.

**How:**

- Give `Schedule` an optional timing hook, or wrap each system in the benchmark build, that adds `performance.now()` deltas per system name into a per-frame record. The physics layer can't use browser globals, so the clock is passed in from the app layer.
- Extend `FrameTimer` to average per-system times over the same warm-up and sample window, and show the top systems under the benchmark's FPS line.
- Extend `tests/benchmark/physicsStep.bench.ts` (`npm run bench`) to report per-system times headlessly, so results don't depend on one browser run.

**Done when:** the benchmark shows how the 46 ms splits across systems, and that split is recorded below as the baseline.

**Risk:** almost none. Timing overhead is tiny compared with the systems being timed.

#### Handoff: phase 0 done, phase 1 next

**State.** Phase 0 is complete. Every task in `superpowers/plans/2026-11-13-physics-performance-phase-0.md` is ticked, and it was built on `feature/physics-timing` with its pull request into `dev`. Don't redo any of it. The baseline is in "Phase 0 baseline split" under Results. The solver takes 46.1 of the 47.5 ms update (97%), the broad phase 1.0 ms and everything else under 0.3 ms.

**Measuring tools now available:**

- **Named systems:** every system has a name, added with `schedule.add("name", system)`. Adding a name twice throws. `schedule.names` lists them in order. A new system (for example phase 1's contact detection and velocity solve) needs a unique name, and its time shows up automatically.
- **`Schedule.runTimed(world, deltaTime, clock, onSystemTimed)`:** times each system together with its deferred flush. `run` does no timing.
- **`SystemTimer`** (`src/app/SystemTimer.ts`): averages per-system times over the warm-up and sample window, slowest first, with each system's share. `FrameTimer` takes the system names and owns one.
- **Browser:** `?scene=benchmark` draws the five slowest systems under the summary line. When the sample finishes, it logs the summary line and a table of every system to the console once. Copy that table into Results.
- **Headless:** `npm run bench` prints the whole-step bench and a per-system table. Vitest's overhead on calls across module exports makes headless steps 3.5–6× slower than the browser, and runs vary a lot. Use headless shares only for relative comparison. The browser split is the reference.
- **Build order:** build the `FrameTimer` after every `update.add`. A system added later is left out of the readout without a warning.

**Phase 1 next steps (#22):**

1. Start a new session, branch from `dev` (for example `feature/contact-solver`), and plan phase 1 in `superpowers/plans/YYYY-MM-DD-physics-performance-phase-1.md` using superpowers:writing-plans.
2. Before planning, settle Open decisions 1–4, 8 and 9 with the owner. Done on 2026-11-14; see "Phase 1 decisions" and the Open decisions list.
3. Write phase 1's stability tests first (Testing: resting contact, stack, pyramid, restitution, friction, momentum), then the solver.
4. Re-run both benchmarks after phase 1. Fill in its Results row and the per-system numbers, and set its Status line.

**Resume prompt:**

> Phase 0 of `superpowers/specs/2026-11-13-physics-performance-design.md` is done (see its "Handoff: phase 0 done, phase 1 next" and "Phase 0 baseline split"). Review phase 1 (cached contacts and a sequential-impulse solver, issue #22). Talk through Open decisions 1–4, 8 and 9 with me, then plan phase 1 with superpowers:writing-plans.

### Phase 1: cached contacts and a sequential-impulse solver (largest gain)

**Status:** done. Browser update 7.42 ms, under the 16.7 ms target; the side-by-side visual check against `dev` passed. Plan: `superpowers/plans/2026-11-14-physics-performance-phase-1.md`. Issue #22. Branch: `feature/contact-solver`. Numbers are under Results and "Phase 1 split".

**What:** run the narrow phase once per step, then iterate on velocities only using the stored contacts. This is how Box2D, Box2D-Lite and most game physics engines solve contacts.

**How:**

1. **Contact manifold.** After the broad phase, run `testCollision` once per candidate pair and store the result in a contact store resource: entity pair, normal, and for each contact point its depth and offset from each body's centre. Polygon–polygon contacts get up to **two points** by clipping the incident edge against the reference edge (the Sutherland–Hodgman clip Box2D uses). Circle contacts keep one point.
2. **Pre-step, once per contact point:** compute the effective mass along the normal and the tangent, the restitution target from the velocity _before_ solving (so bounce is applied once), and the split-impulse target `β × max(depth − slop, 0) / dt`. Below `SolverSettings.restitutionThreshold` (closing speed, px/s) the restitution target is 0, so resting contacts don't jitter with tiny bounces.
3. **Velocity iterations.** For `SolverSettings.velocityIterations` passes (starting at 8), apply normal and friction impulses per contact point. Use **accumulated impulses**: clamp the running total so the normal impulse is never negative and friction stays within `±μ × normal`, then apply only the change. This is what makes few iterations converge. The velocity target holds no overlap term.
4. **Position correction: split impulses (decided).** Overlap is removed through a pseudo-velocity that moves bodies but is never kept as real motion, so it adds no energy. This is the approach Bullet uses (`m_pushVelocity`, `m_turnVelocity`).
   - **Pseudo-velocity solve:** after the velocity solve, `SolverSettings.pseudoVelocityIterations` passes (starting at 3) over the same contacts. Each contact point aims for the split-impulse target from the pre-step and applies its impulse to the pseudo-velocities only. The accumulated pseudo-impulse is clamped to stay non-negative. It isn't warm-started, because it's discarded every step.
   - **Depth is fixed for the step.** The pseudo solve uses the depth from detection and doesn't recompute it as bodies rotate during the step. That's the method's known linear limit, and it's fine for boxes resting flat in stacks.
   - **Where pseudo-velocities live:** solver scratch arrays (`x`, `y`, `angular`), flat typed arrays indexed by a solver-local body index, grown as needed and zeroed each step. They aren't a component, so `Velocity` stays the only place a body's real velocity lives (step 8).
   - **Position integration** moves bodies by `(velocity + pseudoVelocity) × dt`, and the same for the angle, then zeroes the pseudo-velocities.
   - **Rejected:** Baumgarte bias, because its correction becomes real velocity and makes stacks jitter. A separate position pass (Box2D v2.x's nonlinear Gauss–Seidel) and soft constraints (Box2D v3's soft step) were the other candidates.
   - **`SolverSettings` resource:** `velocityIterations` (8), `pseudoVelocityIterations` (3), `beta` (0.2), `slop` (0.5 px), `restitutionThreshold` (20 px/s, kept after tuning in phase 1). The starting counts are Box2D v2's long-standing defaults. Tune by lowering each count until a stability test fails or the benchmark visibly degrades, then step back up and keep a margin of one or two. Record the final values and solver times in the plan.
5. **Warm starting.** Give each contact point a feature ID (which edge and which vertex made it) and keep last step's accumulated impulses by pair and feature. At the start of the step, apply those impulses first. Stacks then start near the solution and settle in far fewer iterations.
6. **Recording.** `ContactLog` and the friction arrows read from the manifold directly, rather than from iteration 0.
7. **Block solver for two-point manifolds (optional, try after the rest works).** The sequential solver handles a manifold's two points one after the other, so they fight: fixing the left corner tilts the box onto the right one. Box2D's block solver solves both normal impulses together as one 2×2 problem. With the "impulse ≥ 0" rule it has only 4 cases (both touching, only one touching, neither), so it can test each directly. Boxes resting flat settle with less rocking and fewer passes. Keep it only if the stack tests show a gain. Friction stays sequential.
8. **Contact storage ready for parallel solving later.** Store manifolds and contact points in flat typed-array columns (as the ECS stores components), keep each body's velocity in exactly one place, and keep the per-contact solve free of shared mutable state other than the two bodies' velocities. That costs nothing now and lets graph colouring and Web Workers be added later without rewriting the solver (see Later).
9. **Step order: split integration (decided).** Today `RigidBodyIntegrationSystem` updates velocity _and_ position before collision runs, so bodies move into each other first and the solver repairs the overlap afterwards. The sequential-impulse solver works best in the Box2D order, where contacts fix velocities _before_ anything moves:

   ```
   forces                    playerInput, mouseDrag, intentForce, gravity, wind, jointForce
   velocityIntegration       velocity += force × inverseMass × dt, then damping; clear forces
   particleIntegration       unchanged, particles don't collide
   broadPhase                uses world vertices from the end of last step
   contactDetection          narrow phase once, store manifolds
   velocitySolve             warm start, then velocityIterations passes (normal + friction)
   pseudoVelocitySolve       pseudoVelocityIterations passes on the scratch arrays
   positionIntegration       position += (velocity + pseudo) × dt; zero pseudo
   colliderTransform         world vertices and bounds from the final positions
   sleep update              sleep thresholds and timers (phase 2)
   ```

   - **Two solver systems.** `velocitySolve` and `pseudoVelocitySolve` are separate systems sharing the contact resource, so the benchmark times each one and their iteration counts can be tuned separately.
   - **No position correction slot.** Split impulses fold it into position integration (step 4).
   - **Collider transforms run last.** `ColliderRenderSystem` draws polygons from `worldVertices` but circles and centre dots from `Transform`. If transforms ran before position integration, a polygon's outline would be drawn one step behind its own centre dot. Running them last keeps both current for rendering, and nothing moves bodies between the end of one step and the next step's broad phase, so the vertices are still valid for detection. A body spawned mid-frame must get its world vertices at spawn; check `spawnDynamicBody` while planning.
   - **Damping moves into velocity integration,** as in Box2D. Today it is applied after the position update, so damped bodies move slightly differently (accepted in decision 4).
   - **The small-velocity snap stays for now.** Today's "snap velocities under the sleep threshold to zero" moves into velocity integration unchanged. Phase 2 removes it, so phase 1 doesn't change sleeping behaviour as well.
   - Particles (`ParticleIntegrationSystem`) keep integrating in one go, because they don't collide. Joints and mouse drag already act through forces, so they keep their place.

10. **Material combine rules.** Restitution combines as `max(a, b)` and friction as `√(a·b)`, as in Box2D. Today's harmonic-mean restitution gives NaN when both are 0, and `min` friction lets one surface decide everything.
11. **Fixed timestep.** Normal scenes step with the real frame time, so `dt` varies from frame to frame, and split impulses' `β × depth / dt` and warm starting both behave worse when it jitters. `main.ts` gets a fixed-step accumulator: step at 1/60 s, with a cap on steps per frame so a slow frame can't spiral. It's app-layer code, and it makes the stability tests deterministic.

**Why iterate rather than solve each group exactly:** resolving a group of touching contacts at once means solving a linear complementarity problem (LCP): every contact either pushes with zero relative velocity, or separates with zero impulse. Direct LCP solvers cost roughly the cube of the number of contacts and get unreliable with friction, and a settled pyramid is one group with thousands of contacts. Sequential impulses with accumulated, clamped impulses is projected Gauss–Seidel, the standard iterative method for this problem, used by Box2D, Bullet, PhysX and Rapier. Exact solves are kept for tiny blocks only (step 7). The owner chose iteration.

**Expected gain:** the narrow phase goes from about 25× per pair to 1×, and each iteration becomes a few multiply-adds per contact point. I'd expect the solver to get roughly 5–20× faster. That is an estimate to confirm with phase 0's numbers.

**Target:** the browser benchmark update is under 16.7 ms. The solver is 97% of the step, so phase 1 has to deliver most of the gain. If it lands at 16.7 ms or above, find what's slow (iteration counts, the block solver, contact storage) before moving on, rather than counting on phases 2–3 to make up the rest.

**Risk:** it changes behaviour, and the owner accepted that (decision 4). Bounces, friction and stacking will feel different:

| Change | Today | After phase 1 |
| --- | --- | --- |
| Bounce | Applied on all 25 passes | Applied once per collision; a ball with restitution r reaches about r² of its drop height |
| Restitution threshold | None | No bounce below `restitutionThreshold` |
| Restitution combine | Harmonic mean, NaN when both are 0 | `max(a, b)` |
| Friction combine | `min(a, b)` | `√(a·b)` |
| Friction limit | Normal impulse, from above only, scaled by `(restitution + 1)` | Coulomb, within `±μ × normal impulse` |
| Damping | After the position update | In velocity integration |
| Contact points | One per pair | Up to two |

What must not change: stacks are at least as stable as on `dev` (the anti-goal), checked by the stability tests and a side-by-side visual check against `dev`. If the demo scene feels dead afterwards, retuning its material values is a follow-up outside phase 1, so the phase 1 comparison stays fair.

**Fixes along the way:** all four correctness issues above, inside phase 1 (decision 8), each with a test. The new effective-mass and clamping code replaces the lines that have them.

#### Handoff: phase 1 done, phase 2 next

**State.** Every task in `superpowers/plans/2026-11-14-physics-performance-phase-1.md` is built and ticked on `feature/contact-solver`, including the optional block solver (kept). Lint, typecheck, build and all tests pass. Don't redo any of it.

**Done before the pull request into `dev`:**

1. Done: browser benchmark recorded in Results row 1 and "Phase 1 split". Update 7.42 ms, under the 16.7 ms bar.
2. Done: side-by-side visual check of `?scene=demo`, `?scene=benchmark` and `?scene=sandbox` against `dev`.
3. Done: Status set to done.
4. Done: the pre-existing tunnelling of small fast circles into the floor is issue #28 (see "Phase 1 split").

**Resume prompt (phase 2):**

> Phase 1 of `superpowers/specs/2026-11-13-physics-performance-design.md` is done (see "Handoff: phase 1 done, phase 2 next" and "Phase 1 split"). Review phase 2 (real sleeping, issue #23). Talk through Open decision 6 with me, then plan phase 2 with superpowers:writing-plans.

### Phase 2: real sleeping

**Status:** done. Sleeping works: the standing benchmark (210 crates) is 100% asleep and updates in 0.43 ms. The 2,000-box falling pyramid never sleeps, because the position correction keeps its pile creeping (see "Phase 2 split"); fixing that is the first item of phase 3. Plan: `superpowers/plans/2026-11-14-physics-performance-phase-2.md`. Issue #23. Branch: `feature/sleeping`. Numbers are under Results and "Phase 2 split".

**What:** bodies that stay still are taken out of the step until something disturbs them.

**Phase 2 decisions (2026-11-14, from the review against `dev` after phase 1):**

- **Decision 6 settled:** one world-wide timeout and threshold set in `SleepSettings`, no per-body override. Starting values, scaled from Box2D's defaults (gravity 200 px/s² against 10 m/s², so about 20 px per metre): `timeout` 0.5 s, `linearThreshold` 1 px/s, `angularThreshold` 0.035 rad/s (2°/s). Tuned on the settled pyramid like phase 1's solver settings.
- **Sleeping islands are recorded.** Contacts between sleepers are never detected (`ContactDetectionSystem` skips pairs where neither body can move, and phase 3 drops them in the broad phase), so an island can't be rebuilt once it sleeps. When an island falls asleep its members are stored in a `SleepingIslands` resource. Waking any member wakes the whole recorded island in one step; destroying a member wakes it too. Without this, waking would spread one contact layer per step and the destroy rule would have no contacts to read.
- **Warm starting across a wake is measured, not kept.** A woken island starts its impulses from 0. A test wakes a sleeping 10-box stack and bounds its sag. Only if that fails are sleeping islands' manifolds kept as well.
- **Joints wake like contacts.** A joint whose ends both can't move (static or asleep) is skipped. A joint with one awake dynamic end and one sleeping end wakes the sleeper. "Wake whenever a joint applies force" is dropped, because a spring holding a body against gravity applies force every step and would never let it sleep.
- **Only a disturbing body wakes.** A body wakes a sleeper it touches or is joined to only when it has no `SleepTimer`, or its `sleepTime` is 0: it was above the thresholds at the last check, or was just woken, dragged or spawned. A still body resting on a sleeper doesn't wake it. Without this rule, two touching bodies sleeping one at a time wake each other forever. `NeverSleep` bodies have a timer stuck at 0, so they always wake what they touch.
- **Joints never push a sleeper.** A sleeping end gets no joint force (it is immovable, as in contacts), and the awake end gets the full force; otherwise force piles up in the sleeper's accumulator and it jumps when woken.
- **Only supported bodies count as still under gravity.** A body whose collider touches nothing this step resets its `sleepTime` while gravity is non-zero, so a body whose timer built up on a support can't fall asleep in mid-air when that support goes (found at gravity 40, where one step of gravity is under 1 px/s).
- **No `NeverSleep` for wind.** Wind is a constant resource and acts like gravity: a body that wind pins against something comes to rest and may sleep, and changing the wind wakes every sleeper.
- **`LinearDamping` stays required** for a dynamic body to integrate. `spawnRigidBody` always adds it; a test checks that it does.
- **The option is `BodyOptions.canSleep`** on `spawnRigidBody` (there is no `spawnDynamicBody`).
- **One plan, two parts:** part A is per-body sleeping, waking and the benchmark windows; part B is islands. A handoff checkpoint sits between them.
- **A sleeper wakes before the hit that wakes it is solved** (found in the demo after the plan). Contact detection first wakes every sleeper whose bounds touch a disturbing body, with `wakeBodyNow`, then builds the manifolds, so the woken island is movable in that same step. Treating the sleeper as immovable for the waking step stopped the hitting body like a wall, and the woken stack was only pushed gently afterwards.
- **The benchmark pyramid is all 12×12 boxes, and a standing benchmark is added** (owner's decision after the plan). Circles made it hard to see what slept. `?scene=benchmark&pyramid=standing` builds 210 30×30 crates in 20 rows resting on the floor, which stand and fall asleep; a 2,000-box standing pyramid collapses under its own weight with 8 velocity passes. The demo gets a three-crate stack so waking can be checked by hand.

**Design: tags for eligibility and state, a resource for settings, one component for the timer.** (The owner chose this over making "has a `Sleep` component" the rule for which bodies can sleep.)

| Piece           | Kind                              | Purpose                                                                                                                                        |
| --------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `NeverSleep`    | tag (`{}`)                        | This body may never sleep: the player, script-driven bodies such as moving platforms, fast projectiles, and bodies under constant small forces |
| `Asleep`        | tag (`{}`)                        | This body is asleep. Active systems exclude it with `without: [Asleep]`                                                                        |
| `SleepTimer`    | component, `{ sleepTime: "f64" }` | Seconds this body has stayed below the thresholds. Replaces today's `Sleep` component                                                          |
| `SleepSettings` | resource                          | `enabled` (world-wide switch, for debugging), `linearThreshold`, `angularThreshold`, `timeout` (about 0.5 s)                                   |

**Rules:**

- **Opt out, not in.** Most bodies should sleep, so the few that shouldn't get `NeverSleep`. `spawnRigidBody`'s `BodyOptions` gets a `canSleep` option (default `true`); `false` adds `NeverSleep`. The demo spawns the player with `canSleep: false`.
- **Which bodies can sleep:** dynamic bodies with `SleepTimer` and without `NeverSleep`, while `SleepSettings.enabled` is true. Static bodies never get a timer.
- **Integration stops requiring a sleep component.** Today `RigidBodyIntegrationSystem`'s view includes `Sleep`, so a dynamic body without it isn't integrated at all. The new velocity and position integration views require `[Transform, Velocity, ForceAccumulator, Mass, LinearDamping]` and exclude `Asleep` and `Particle`. Phase 1's `VelocityIntegrationSystem` and `PositionIntegrationSystem` still require `Sleep` (a finding deferred from phase 1's review), so this is where it goes. `LinearDamping` stays required (decided above). Test: a body without the sleep timer falls under gravity.
- **Thresholds move to the resource.** Per-body thresholds are dropped until something needs them. The per-step "snap small velocities to zero" in today's integration is removed; zeroing velocity happens once, when a body falls asleep. This is a behaviour change: slow drift that is snapped to zero today becomes real motion until the body sleeps.

**Systems:**

- **Sleep update system**, last in the update schedule (after collider transforms). For each `[SleepTimer, Velocity]` body without `NeverSleep` or `Asleep`: if linear and angular speed are below the thresholds, add `deltaTime` to `sleepTime`, otherwise reset it to 0. When `sleepTime ≥ timeout` (per body in part A, for the whole island in part B), defer: zero the velocity, clear the force accumulator, add `Asleep`, and record the group in `SleepingIslands`.
- **World-change wake system**, first in the update schedule. It remembers last step's gravity, wind, collision matrix version and `SleepSettings.enabled`, and wakes every sleeper when one changes. Code that changes those resources needs no extra call.
- **Island system** (part B), right after contact detection. Union-find over awake dynamic bodies, linked by this step's manifolds and by joints.
- **Systems that skip sleepers** (`without: [Asleep]`): gravity, wind, velocity integration, position integration, collider transforms and the sleep update. The joint force system skips joints whose ends both can't move. A sleeping body doesn't move, so its world vertices and bounds stay valid.
- **The broad phase still inserts sleepers**, so awake bodies can find them. Pairs where neither body can move (static or asleep) aren't emitted (phase 3).
- **The solver treats a sleeper as immovable** (inverse mass and inertia 0 in that contact). Contact detection checks `Asleep` for this, because a sleeper keeps its `Velocity` and "immovable" otherwise means "has no `Velocity`". Before building any manifold, contact detection wakes every sleeper whose bounds touch a disturbing body, at once, so the hit that wakes it also moves it (see "Phase 2 decisions"). Wakes queued before velocity integration (mouse drag, joints, intent forces) take effect in the same step, because `Schedule` flushes deferred commands after every system.

**Waking** removes `Asleep` and resets `sleepTime` to 0, through one helper, `wakeBody(world, entity)`. It resets the timer at once and defers removing `Asleep` from every member of the body's recorded island. It's called when:

- an awake dynamic body's bounds touch a sleeper's (contact detection, through `wakeBodyNow`, which wakes the island at once instead of deferring);
- a joint links an awake dynamic body to a sleeper (joint force system);
- the mouse drag holds a body, every step it's held, so a held body never falls asleep (`MouseDragSystem`);
- a body's movement intent is non-zero (`IntentForceSystem`);
- code sets a sleeper's velocity, position or force directly. Those call sites call `wakeBody` themselves.

**Waking without motion.** The broad phase drops pairs where neither body can move (phase 3), so a sleeper is only woken by contact when an _awake_ body reaches it. These changes don't involve any awake body, so each needs its own wake rule:

- **A body is destroyed** through `destroyBody(world, entity)`. It wakes the body's recorded island, every sleeper whose bounds overlap the body's bounds (this covers a static floor, which links no island), and the bodies on the other end of its joints, then destroys it. Otherwise removing the bottom crate of a sleeping stack leaves the rest floating. Stored contacts can't be used for this, because contacts between sleepers are never detected.
- **A static body is moved by code.** Moving platforms, elevators and other script-driven bodies aren't static. They're dynamic or kinematic bodies with `NeverSleep`, so an awake body moving through sleepers creates pairs and wakes them. If code still moves a static body, it calls `moveStaticBody`, which wakes every sleeper whose bounds overlap the static body's old or new bounds. Resizing the demo window moves the walls and wakes every sleeper.
- **World settings change.** Changing the gravity or wind resource wakes every sleeper (world-change wake system). It's rare, so waking everything is fine.
- **Collision rules change.** Changing the collision matrix (`CollisionSettings`, which gets a version counter) wakes every sleeper. Changing a body's group goes through `setCollisionGroup`, which wakes the sleepers overlapping that body. Two sleepers that are newly allowed to collide may already overlap.
- **Sleeping is switched off.** Setting `SleepSettings.enabled` to false wakes every sleeper.

**Deferral (`world.defer`):** adding and removing `Asleep` are structural changes, so they're always deferred and applied when the queuing system finishes (`Schedule.run` flushes after every system). Commands capture entity IDs, never slots, and check `world.isAlive(entity)` before changing anything. Waking an island queues one command per body, or one command that wakes them all. Commands queued while flushing run in the same flush.

**Cost of `without`:** views are uncached, so a sleeping body still costs one store lookup per system per step, but none of the physics work. If that lookup ever shows up in phase 0's timings, a cached view or group (see `src/ecs/README.md`) removes it.

**Islands (second step):** group bodies connected by contacts and joints, and sleep or wake a whole group together. Without islands, a body at the bottom of a stack can fall asleep while the bodies on top still push on it, so the stack sinks or jitters. An island sleeps only when every body in it can sleep and has stayed still for the timeout. One `NeverSleep` body, such as the player standing on a pile of crates, keeps its whole island awake. Islands also give phase 1's solver a natural unit of work.

- **What an island is:** the bodies linked by a chain of contacts or joints. Bodies don't all have to touch each other: if A touches B and B touches C, then A, B and C are one island. Static bodies don't link islands, so two piles on the same floor are two islands.
- **Building them:** each step after contact detection, use union-find over awake dynamic bodies. Start with every body in its own set, merge the two sets for each contact and joint, and skip static bodies. This is close to linear in the number of contacts. Islands split by themselves when a pile breaks apart, because they're rebuilt every step. An island that falls asleep is recorded in `SleepingIslands` (see "Phase 2 decisions"), because it can't be rebuilt while asleep.
- **Solving per island (keep only if measured to help):** the velocity solve runs island by island, iterating over each island's contacts (phase 1). The result is the same as solving all contacts mixed together, because islands don't affect each other, but the data each island touches stays together in memory. Islands are needed for sleeping either way; the reordering is kept only if `velocitySolve` gets faster.
- **To try later, not in the phase 2 plan:**
  - _Iteration count per island._ A lone body needs 1–2 passes and a tall stack 8 or more. Stop an island early once its corrections fall below a tolerance.
  - _Bottom-up order._ Solve each island's contacts in order of distance from static bodies, counted in contacts (floor contacts first), so support passes upward each pass. Warm starting may already make this unnecessary.
- **Big islands are expected.** Fifty crates in one pile are one island, and the 2,000-body benchmark pyramid is almost certainly a single island. Solver cost doesn't change (it's contacts × passes either way), but:
  - one restless body keeps the whole island awake, and touching any body wakes all of it. That's the price of stable stacks, and the main lever against it is the thresholds in `SleepSettings`;
  - the island needs enough passes for its hardest part;
  - a single island can't be split across Web Workers. That needs graph colouring (see Later).

**Debug draw:** an option in `DebugOptions` to colour sleeping bodies differently.

**Expected gain:** once the benchmark pyramid settles, nearly every body is asleep, so a step costs a fraction of today's. Benchmarks that only measure a settled scene will look much better than a falling one, so measure both (see "Measuring").

**Risk:** bodies that sleep in mid-air or never wake. It needs tests for waking on contact, joint, drag and direct velocity changes.

#### Handoff: phase 2 done, phase 3 next

**State.** Every task in `superpowers/plans/2026-11-14-physics-performance-phase-2.md` is built or ruled on, on `feature/sleeping`. Lint, typecheck, build and all tests pass. Don't redo any of it.

**Done before the pull request into `dev`:**

1. Done: browser numbers for both pyramids and both windows in Results row 2 and "Phase 2 split".
2. Done: visual check. Sleepers turn grey in the standing benchmark, and the demo's crates sleep and are knocked over by the player's first hit.
3. Done: Status set to done.
4. Open, moved to phase 3: the falling pile never sleeps because of the split-impulse position correction (Phase 3, first item).

**Deferred minors from the final review** (fix when convenient, none changes behaviour): per-step allocations in `Islands` and the sleep system; contact detection looks up a body's mass and sleep state several times per manifold; a `NeverSleep` tag added at runtime keeps a non-zero timer, so that body stops disturbing sleepers; the sleep system's readiness check does two lookups per body per step.

**Resume prompt (phase 3):**

> Phase 2 of `superpowers/specs/2026-11-13-physics-performance-design.md` is done (see "Handoff: phase 2 done, phase 3 next" and "Phase 2 split"). Review phase 3 (issue #24), starting with its first item, position correction that lets piles rest. Talk through the choice between nonlinear Gauss–Seidel and a soft step with me, then plan phase 3 with superpowers:writing-plans.

### Phase 3: position correction and broad-phase trimming

**Status:** not planned. Issue #24.

**What:** first, let piles come to rest so they can sleep; then produce fewer candidate pairs, and do less work per step to produce them.

**First item: position correction that lets piles rest** (owner's decision at the end of phase 2).

- **Problem:** the 2,000-box falling pyramid collapses into a pile that never stops creeping, so it never sleeps (0% asleep after a minute, update 11.79 ms in the settled window). Measured on the box pile: over 10 s, 1,600 boxes moved more than 1 px, outward on average (2.2 px at friction 0.1, 3.7 px at friction 0.6), while 196–467 contact points sat deeper than 1 px (up to 4.5 px, against a 0.5 px slop).
- **Cause:** phase 1's split-impulse pass (`pseudoVelocitySolve`) pushes those points apart along their normals with no friction, and between tilted boxes the normals point partly sideways. Gravity pulls the boxes back, so every step ratchets them outward, and the restored velocities keep some bodies above the 1 px/s sleep threshold. With that pass switched off after 30 s, the same pile stopped completely and all 2,000 boxes fell asleep. 16 velocity passes, β 0.1 or a 1 px slop each still ended 0.0–0.1% asleep.
- **Options to evaluate:** nonlinear Gauss–Seidel position correction (Box2D 2.x: re-measure the overlap from current positions on every correction pass, so correction can't overshoot), or Box2D 3's soft step (soft constraints with relax passes that drop the bias). Either changes how every stack behaves, so the stability tests and a visual check against `dev` gate it.
- **Done when:** the falling benchmark pile falls asleep within about 30 s of settling, the stability tests pass, and stacks look no worse than on `dev`.

**Then the broad phase:**

- **Skip static and sleeping pairs:** emit a pair only if **at least one body is awake and dynamic**. The check runs once per step in the broad phase instead of 25 times in the solver. Sleepers stay in the grid, so awake bodies still find them.

  | Body A | Body B | Emitted | Why                                                         |
  | ------ | ------ | ------- | ----------------------------------------------------------- |
  | awake  | awake  | yes     | normal contact                                              |
  | awake  | asleep | yes     | the wake path: the solver resolves it and wakes the sleeper |
  | awake  | static | yes     | e.g. landing on the floor                                   |
  | asleep | asleep | no      | neither has moved since sleeping                            |
  | asleep | static | no      | the sleeper rests on it and neither moves                   |
  | static | static | no      | static bodies never move                                    |

  Anything that changes the world without motion (destroying a body, moving a static body, changing gravity, wind or collision rules) is handled by phase 2's "waking without motion" rules, not by the broad phase.

- **Separate static grid:** insert static bodies such as the walls once, into their own grid. Each step, only moving bodies are re-inserted, and each is checked against both grids.
- **Cell size:** falling-benchmark bodies are 12×12 boxes, standing-benchmark crates 30×30, and cells are 20 px. Tune with phase 0's timings. Too small and each body covers many cells; too large and each cell holds many bodies.
- **Pair slots:** store each pair's collider, transform, mass, velocity and material slots in `CandidatePairs`, so the solver doesn't call `slotOf` in its loops (item 7 above).
- **Alternative to evaluate, not adopt:** sweep-and-prune (sort bounds along one axis) or a dynamic AABB tree. Only worth trying if the broad phase is still a large share of the time after phases 1–2.

**Expected gain:** smaller than phases 1–2, but it scales with body count.

**Risk:** low. Candidate pairs must stay the same apart from the ones deliberately skipped, so a test should compare pair sets before and after.

### Phase 4: narrow-phase and transform work

**Status:** not planned. Issue #25.

**What:** smaller wins in code that phase 1 has already cut down to one call per pair.

**How:** six independent items. Each can be done, measured and merged on its own.

1. **Skip colliders that didn't change.** `ColliderTransformSystem` calls `transformCollider` (`src/shapes/colliderGeometry.ts`) for every body every step. For a polygon that means `cos` and `sin`, rotating every vertex and rebuilding the bounds, even for bodies that never move.
   - **Static bodies:** transform once at spawn and exclude them from the transform view (for example `without` a static marker, or requiring `Velocity`). Phase 2's helper for moving a static body re-transforms it when that happens. This is the most certain item, because the walls are re-transformed every step for nothing today.
   - **Sleepers:** already skipped by phase 2 (`without: [Asleep]`).
   - **Translated only (angle unchanged):** shift the vertices and bounds by the offset, as `translateCollider` already does, without `cos`/`sin` or rotation.
   - **Not moved at all:** compare position and angle with last step's and skip. Rare for awake bodies, so the lowest priority.
2. **Rotate stored local normals instead of recomputing them.** When the angle changes, `computeNormals` rebuilds every edge normal from the world vertices: a subtraction, a `Math.hypot` and two divisions per edge. Normals only rotate with the body. Store each polygon's local normals once at spawn, a new `localNormals` collider field built by the same code from the local vertices. Rotate them with the `cos` and `sin` already computed for the vertices: 4 multiplies and 2 adds per normal, with no square root or division.
3. **Remove the per-test edge maths in circle vs polygon.** `circleVsPolygonEdges` recomputes each edge's direction and length with `Math.hypot` and two divisions on every test. Neither needs computing:
   - **Direction:** `computeNormals` sets `normal = (dirY, −dirX)`, so the edge direction is `(−normalY, normalX)`, read from the stored world normals.
   - **Length:** rotation and translation never change an edge's length, so store each polygon's edge lengths once at spawn (a new `edgeLengths` collider field).

   Since phase 2 the benchmark is all boxes, so circle–polygon tests only matter for scenes with circles (the sandbox); measure there.

4. **Cache the separating axis per pair.** SAT exits as soon as an edge separates the shapes (`deepestContact` returns `false` when no vertex lies behind the edge), but in the worst case it tries every edge of both polygons first (up to 8 edge tests for two boxes, each against 4 vertices). Neighbouring bodies rarely change arrangement between steps, so store per pair which polygon and edge separated them last step, and test that edge first. If it still separates, the test ends after 1 edge instead of up to 8. For touching pairs, store the reference edge instead. Phase 1's clipping starts from it, and it's part of the contact's feature ID for warm starting. It lives in the same per-pair store phase 1 adds, keyed by the entity pair. It mostly helps pairs that are near but not touching, so measure it before keeping it.
5. **`Math.hypot` → `Math.sqrt(x * x + y * y)` in hot paths.** V8's `Math.hypot` guards against overflow and underflow that engine-scale numbers never reach, and it is noticeably slower. Items 2 and 3 remove the calls in collider transforms and the narrow phase. Switch the rest that run per contact or per step, such as friction tangent normalisation in the solver and joint lengths, and leave one-off uses (shape construction) alone.
6. **Build the block solver's matrix once per step.** Phase 1's 2×2 normal block solve (`solveNormalBlock` in `src/collisionDetectionSystem/sequentialImpulse.ts`) rebuilds K (k11, k12, k22) and its condition check on every velocity pass, although K only depends on the anchors, normal and masses, which don't change within a step. Compute K, its inverse and the condition result once in `prepareContacts`, and store them per manifold in `ContactManifolds`. The velocity solve is the largest system in the phase 1 browser split (40.5%), so measure it before and after. A finding deferred from phase 1's review. Test: the block solver test gives the same impulses with the stored matrix.

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
       └─ Phase 3 (position correction, then broad-phase trimming)
            └─ Phase 4 (narrow-phase details)  only if numbers still call for it
```

Each phase is its own sub-issue (#21–#25), branch from `dev` and pull request back into `dev`, so its benchmark change can be seen on its own. When a phase is planned, built or measured, update its **Status** line and the results table.

## Measuring

- **Browser:** `?scene=benchmark` gives update ms, render ms and draw calls, and per-system ms after phase 0. Use the same browser and machine for before and after, and note them.
- **Headless:** `npm run bench` (`tests/benchmark/physicsStep.bench.ts`) for numbers that don't depend on the browser.
- **Two moments:** the benchmark samples a fixed window after 60 warm-up frames. That window (frames 60–360) is the pyramid's collapse and settling: heavy contact, little asleep. Once sleeping exists, `?scene=benchmark&window=settled` samples 300 frames after the pyramid has settled, so sleeping's gain is measured and doesn't hide a slow solver. `npm run bench` reports both.
- **Two pyramids (since phase 2):** the default `pyramid=falling` drops 2,000 12×12 boxes, which collapse into a pile; `pyramid=standing` builds 210 30×30 crates resting on the floor, which stand and sleep. Both windows work with both. Only the falling pyramid is comparable with earlier rows, and phases 0–1 used a pyramid of circles and boxes, so it is heavier than theirs.

### Results

| Phase                  | Browser update ms | Headless step ms | Solver ms | Broad phase ms | Notes                                                                                                                                                                                                                                    |
| ---------------------- | ----------------- | ---------------- | --------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baseline (ECS, PR #12) | 46.25             |                  |           |                | Brave, 2,000 bodies. Per-system numbers come from phase 0                                                                                                                                                                                |
| 0                      | 47.52             | 164.67 / 242.38  | 46.14     | 0.99           | Brave, Windows 11, same machine as the baseline. Render 1.73 ms, 6 draw calls. Headless: Node v24.14.1, Vitest 5.1.0, two `npm run bench` runs that disagreed by about 47%. The browser solver and broad-phase numbers are the reference |
| 1                      | 7.42              | 16.10 / 16.39    | 3.45      | 1.08           | Brave, Windows 11, same machine as phase 0. Render 2.00 ms, 6 draw calls. Solver is velocity solve 3.00 + pseudo-velocity solve 0.44 ms, against 46.14 for phase 0's `collisionSolver`. Update is 6.4× faster and under the 16.7 ms bar. Headless: two `npm run bench` runs, Node v24.14.1 |
| 2                      | 10.62 / 11.79     | 29.70 / 31.33    | 5.85      | 1.01           | Brave, Windows 11, same machine. Falling pyramid of 2,000 boxes, collapse / settled window; 0% asleep in both, because the pile never stops creeping (see "Phase 2 split"). Not comparable with row 1: the pyramid is now all boxes. Before the switch, the circle-and-box pyramid measured 7.48 / 8.09 ms, against phase 1's 7.42. Standing pyramid (210 crates): 0.52 / 0.43 ms, 100% asleep. Headless: one `npm run bench` run, Node v24.14.1 |
| 3                      |                   |                  |           |                |                                                                                                                                                                                                                                          |
| 4                      |                   |                  |           |                |                                                                                                                                                                                                                                          |

#### Phase 0 baseline split

Each system's average time over the sample window. Browser: Brave, `?scene=benchmark`, frames 60–360, from the console table. Headless: `npm run bench`, the per-system test, steps 120–420.

| System               | Browser ms | Browser share | Headless ms | Headless share |
| -------------------- | ---------- | ------------- | ----------- | -------------- |
| collisionSolver      | 46.144     | 97.1%         | 286.719     | 97.7%          |
| broadPhase           | 0.985      | 2.1%          | 5.100       | 1.7%           |
| colliderTransform    | 0.204      | 0.4%          | 0.835       | 0.3%           |
| rigidBodyIntegration | 0.130      | 0.3%          | 0.590       | 0.2%           |
| gravity              | 0.036      | 0.1%          | 0.128       | 0.0%           |
| playerInput          | 0.002      | 0.0%          | 0.008       | 0.0%           |
| jointForce           | 0.002      | 0.0%          | 0.001       | 0.0%           |
| wind                 | 0.002      | 0.0%          | 0.003       | 0.0%           |
| particleIntegration  | 0.001      | 0.0%          | 0.001       | 0.0%           |
| mouseDrag            | 0.001      | 0.0%          | 0.006       | 0.0%           |
| intentForce          | 0.000      | 0.0%          | 0.001       | 0.0%           |

What this shows:

- **The solver is the step.** 46.1 of 47.5 ms is `collisionSolver`, which confirms that phase 1 (narrow phase once per step, iterating only on velocities) is where nearly all of the gain is. Phases 3 and 4 work on the remaining ~1.4 ms, less than 3% of the step. They only matter once phases 1 and 2 have shrunk the solver.
- **Headless numbers are relative only.** Vitest's module-runner adds overhead to every call across module exports, and the solver makes the most of those calls. Headless steps run 3.5–6× slower than the browser and vary a lot between runs. Use the headless shares to compare changes, and the browser split as the baseline.
- **The two windows differ.** The browser samples frames 60–360, and the headless test samples steps 120–420, while the pyramid is still settling. The splits agree anyway.
- **Small systems are noisy in the browser.** Brave coarsens `performance.now()`, so the times under 0.01 ms are only rough.

#### Phase 1 split

Browser: Brave, `?scene=benchmark`, frames 60–360, from the console table. Headless: `npm run bench` per-system test, steps 120–420, two runs.

| System              | Browser ms | Browser share | Headless run 1 ms | Run 1 share | Headless run 2 ms | Run 2 share |
| ------------------- | ---------- | ------------- | ----------------- | ----------- | ----------------- | ----------- |
| velocitySolve       | 3.004      | 40.5%         | 4.588             | 28.2%       | 4.982             | 28.7%       |
| contactDetection    | 2.387      | 32.2%         | 6.428             | 39.5%       | 6.842             | 39.4%       |
| broadPhase          | 1.084      | 14.6%         | 3.271             | 20.1%       | 3.451             | 19.9%       |
| pseudoVelocitySolve | 0.442      | 6.0%          | 0.812             | 5.0%        | 0.927             | 5.3%        |
| colliderTransform   | 0.204      | 2.7%          | 0.465             | 2.9%        | 0.433             | 2.5%        |
| velocityIntegration | 0.153      | 2.1%          | 0.389             | 2.4%        | 0.394             | 2.3%        |
| gravity             | 0.067      | 0.9%          | 0.095             | 0.6%        | 0.093             | 0.5%        |
| positionIntegration | 0.062      | 0.8%          | 0.207             | 1.3%        | 0.221             | 1.3%        |
| others              | < 0.01     | 0.0%          | < 0.01            | 0.0%        | < 0.01            | 0.0%        |
| **total**           | 7.42       | 100%          | 16.260            | 100%        | 17.352            | 100%        |

What this shows:

- **The solver is no longer the step.** In the browser, phase 0's `collisionSolver` was 46.1 ms (97%). Both solves are now 3.4 ms, and the whole update is 7.42 ms, 6.4× faster and under the 16.7 ms bar. Headless, the solver went from 286.7 ms to 5.4–5.9 ms.
- **The browser and headless orders differ.** In the browser the velocity solve is the largest system (40.5%) and contact detection second (32.2%); headless, detection leads. Vitest's per-call overhead lands hardest on detection's calls into the narrow phase. The browser split is the reference.
- **Detection and the broad phase are 47% of the browser update** (60% headless). That is where phases 3 and 4 work (static pairs, a separate static grid, pair slots, the narrow-phase micro-optimisations). The velocity solve's share is what phase 2's sleeping removes for the settled pyramid.
- **The 8 ms goal for phases 1–3 is met in this window already.** Frames 60–360 cover the pyramid while it is still settling, so the settled pyramid should be cheaper still. Phases 2–3 now add headroom rather than close a gap. Re-measure a settled window and the collapse before deciding how much of them is worth building.
- **Solver settings:** the tuning in the plan's Task 9 kept 8 velocity and 3 pseudo-velocity passes, β 0.2 and a 20 px/s restitution threshold. The Box2D-style 2×2 block solver for two-point manifolds was kept: without it a ten-box stack swayed 2.7 px at 8 passes, with it 0.000 px from 4 passes up.
- **Known gap, not new:** a small fast circle can tunnel into the floor during the pyramid's collapse (about 480 px/s, more than its radius per step). `dev` loses a body the same way at the same moment. Continuous collision is a non-goal, so it is tracked on its own in issue #28.

#### Phase 2 split

Browser: Brave, from the console tables. Collapse is frames 60–360, settled is 300 frames after 1,800 warm-up frames. Headless: one `npm run bench` run, falling pyramid, steps 120–420 and after 1,800 steps.

| System              | Falling, collapse | Falling, settled | Standing, collapse | Standing, settled | Headless collapse | Headless settled |
| ------------------- | ----------------- | ---------------- | ------------------ | ----------------- | ----------------- | ---------------- |
| velocitySolve       | 5.138             | 5.695            | 0.108              | 0.001             | 8.440             | 9.303            |
| contactDetection    | 3.035             | 3.416            | 0.095              | 0.061             | 12.160            | 12.429           |
| broadPhase          | 1.010             | 1.073            | 0.249              | 0.307             | 4.706             | 4.955            |
| pseudoVelocitySolve | 0.715             | 0.864            | 0.013              | 0.001             | 1.196             | 1.346            |
| colliderTransform   | 0.334             | 0.333            | 0.011              | 0.008             | 0.702             | 0.687            |
| islands             | 0.129             | 0.141            | 0.010              | 0.007             | 1.117             | 1.190            |
| velocityIntegration | 0.079             | 0.079            | 0.009              | 0.011             | 0.467             | 0.471            |
| sleep               | 0.065             | 0.070            | 0.007              | 0.007             | 0.434             | 0.466            |
| positionIntegration | 0.050             | 0.055            | 0.006              | 0.007             | 0.275             | 0.284            |
| gravity             | 0.048             | 0.049            | 0.002              | 0.005             | 0.186             | 0.194            |
| others              | < 0.01            | < 0.01           | < 0.01             | < 0.01            | < 0.01            | < 0.01           |
| **update**          | 10.62             | 11.79            | 0.52               | 0.43              | 29.70             | 31.33            |
| **asleep**          | 0%                | 0%               | 100%               | 100%              | 0%                | 0%               |

What this shows:

- **Sleeping works when a pile comes to rest.** The standing pyramid is fully asleep in both windows. Settled, both solves drop to about 0.001 ms and the update is 0.43 ms. What is left is the broad phase (0.31 ms, 73%), which still treats sleeping pairs like awake ones; phase 3's pair skipping removes that.
- **The falling pile never sleeps, and that is a solver problem, not a sleeping one.** The split-impulse pass keeps pushing deep contacts apart sideways, so the pile creeps outward by a few pixels every 10 s. Switching that pass off made the same pile stop and fall fully asleep. This is the first item of phase 3.
- **Sleeping's own cost is small.** `islands` and `sleep` together take 0.19–0.21 ms in the browser on 2,000 awake bodies. Headless they take 1.5–1.7 ms, because Vitest's per-call overhead lands on their per-body lookups. On the circle-and-box pyramid, before the switch to boxes, the update was 7.48 ms against phase 1's 7.42.
- **Boxes are heavier than the old mix.** Box contacts have more points, so velocity solve and detection rose: the falling-box collapse is 10.62 ms against 7.48 ms for the old pyramid. Later rows compare against row 2, not row 1.
- **Targets:** the collapse stays under 16.7 ms (10.62). The settled goal of under 8 ms is met by the standing pyramid (0.43 ms) but not by the falling pile (11.79 ms), which needs phase 3's position correction to settle.
- **Wake on the first hit** (found during the visual check): a sleeper is now woken before the contact that wakes it is built, so a hit knocks a sleeping stack over at once instead of stopping against it.

## Testing

Speed-ups in a solver are easy to get by quietly breaking it, so phase 1 adds tests first:

- **Resting contact:** a box on the ground settles and stays within a small depth of the surface after N seconds, without drifting or sinking.
- **Stack:** a column of boxes (e.g. 10) stays standing for N seconds, and the top box's sideways drift stays under a tolerance.
- **Pyramid:** the benchmark pyramid, or a smaller one, stays standing after settling.
- **Restitution:** a ball dropped with restitution r reaches about r² of its drop height. Restitution 0 doesn't bounce and doesn't produce NaN. A contact closing slower than `restitutionThreshold` doesn't bounce.
- **Friction:** a box on a slope steeper than `atan(μ)` slides, and one on a shallower slope doesn't. That covers the negative-tangent and clamp fixes. Friction is the same for two materials that differ only in restitution, which covers the `(restitution + 1)` fix.
- **Split impulses:** resolving an overlap adds no velocity. A box placed slightly into the ground, with no gravity, moves out to within `slop` over a few steps, and its velocity stays zero throughout.
- **Fixed timestep:** the accumulator steps at 1/60 s whatever the frame time, and never runs more than the per-frame cap.
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

1. **Position correction:** decided: split impulses, with pseudo-velocities in solver scratch arrays (phase 1, step 4). Baumgarte is ruled out.
2. **Step order:** decided: split integration, with collider transforms last and two solver systems, `velocitySolve` and `pseudoVelocitySolve` (phase 1, step 9).
3. **Iteration count:** decided: a `SolverSettings` resource starting at 8 velocity and 3 pseudo-velocity passes, β 0.2, slop 0.5 px, tuned against the stability tests (phase 1, step 4).
4. **Behaviour change:** decided: accepted, along with `max` restitution and `√(a·b)` friction combine rules, a restitution threshold in `SolverSettings`, and a fixed-step accumulator in `main.ts` (phase 1, steps 10–11 and Risk).
5. **Sleeping representation:** decided: `NeverSleep` and `Asleep` tags, a `SleepTimer` component and a `SleepSettings` resource (phase 2).
6. **Sleep timeout:** decided: one world-wide set in `SleepSettings` (timeout 0.5 s, 1 px/s, 0.035 rad/s), no per-body override; `NeverSleep` covers bodies that must stay awake. See "Phase 2 decisions".
7. **Islands:** decided: part of phase 2, as the grouping for sleeping and solving, with iteration inside each island. Parallel solving (Web Workers, graph colouring) is a separate issue later.
8. **Correctness fixes:** decided: all four are fixed inside phase 1, each with a test. The NaN fix waits for phase 1.
9. **Targets:** decided: phase 1's bar is a browser benchmark update under 16.7 ms. The goal for phases 1–3 together is under 8 ms for the settled pyramid and under 16.7 ms during the collapse.

## References

- Erin Catto, "Iterative Dynamics with Temporal Coherence" (GDC 2005) and "Fast and Simple Physics using Sequential Impulses" (GDC 2006): accumulated impulses, warm starting and Box2D-Lite.
- Box2D-Lite source: a small, readable 2D sequential-impulse solver with clipping and warm starting.
- Ian Millington, _Game Physics Engine Development_: contact generation, the resolution order and sleeping (the book this engine follows).
- _3D Math Primer for Graphics and Game Development_, 2nd edition, chapter 12: the impulse maths `resolveImpulse` already follows.
