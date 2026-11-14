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

**Expected gain:** the narrow phase goes from about 25× per pair to 1×, and each iteration becomes a few multiply-adds per contact point. I'd expect the solver to get roughly 5–20× faster. That is an estimate to confirm with phase 0's numbers.

**Risk:** it changes behaviour. Bounces, friction and stacking will feel different. Restitution applied once means things bounce less than now, which is the correct behaviour. Covered by the tests in "Testing" below and a side-by-side visual check against `dev`.

**Fixes along the way:** the three correctness issues above. The new effective-mass and clamping code replaces the lines that have them.

### Phase 2: real sleeping

**What:** bodies that stay still are taken out of the step until something disturbs them.

**How:**
- Add per-body state: `sleepTime` (seconds below the thresholds) and an `asleep` flag. Either extend the `Sleep` component or add an `Asleep` tag component (**Open**). A tag works with `world.view(..., { without: [Asleep] })`, so systems skip sleeping bodies for free. Its cost is adding and removing components when bodies fall asleep or wake.
- When linear and angular speed stay below the thresholds for a time (about 0.5 s; **Open**), the body falls asleep: velocity is zeroed and it is skipped by integration, collider transforms and the solver.
- **Waking:** a body wakes when an awake body's contact touches it, when a joint attached to it applies force, when the mouse drags it, or when a force or velocity is set on it directly.
- **Islands (second step):** group bodies connected by contacts and joints, and sleep or wake a whole group together. Without islands, a body at the bottom of a stack can fall asleep while the bodies on top still push on it, so the stack sinks or jitters. Islands fix that, and they also give phase 1's solver a natural unit of work.
- Debug draw: an option in `DebugOptions` to colour sleeping bodies differently.

**Expected gain:** once the benchmark pyramid settles, nearly every body is asleep, so a step costs a fraction of today's. Benchmarks that only measure a settled scene will look much better than a falling one, so measure both (see "Measuring").

**Risk:** bodies that sleep in mid-air or never wake. It needs tests for waking on contact, joint, drag and direct velocity changes.

### Phase 3: broad-phase trimming

**What:** produce fewer candidate pairs, and do less work per step to produce them.

**How:**
- **Skip static and sleeping pairs:** don't emit a pair when neither body can move (static, or asleep after phase 2). The check runs once per step in the broad phase instead of 25 times in the solver.
- **Separate static grid:** insert static bodies such as the walls once, into their own grid. Each step, only moving bodies are re-inserted, and each is checked against both grids.
- **Cell size:** benchmark bodies are 12 px wide (circle radius 6, box size 12) and cells are 20 px. Tune with phase 0's timings. Too small and each body covers many cells; too large and each cell holds many bodies.
- **Pair slots:** store each pair's collider, transform, mass, velocity and material slots in `CandidatePairs`, so the solver doesn't call `slotOf` in its loops (item 7 above).
- **Alternative to evaluate, not adopt:** sweep-and-prune (sort bounds along one axis) or a dynamic AABB tree. Only worth trying if the broad phase is still a large share of the time after phases 1–2.

**Expected gain:** smaller than phases 1–2, but it scales with body count.

**Risk:** low. Candidate pairs must stay the same apart from the ones deliberately skipped, so a test should compare pair sets before and after.

### Phase 4: narrow-phase and transform work

**What:** smaller wins in code that phase 1 has already cut down to one call per pair.

**How:**
- **Cache the separating axis:** remember which axis separated a pair last step and test it first. Most pairs that were apart stay apart.
- **Skip unchanged colliders:** `ColliderTransformSystem` skips sleeping bodies (phase 2) and bodies whose position and angle didn't change.
- **Less repeated maths:** `circleVsPolygonEdges` computes each edge's length and direction with `Math.hypot` on every call. Store edge directions next to world normals when the collider is transformed.

**Expected gain:** small. Do it only if phase 0's numbers show the narrow phase or transforms still matter after phases 1–3.

### Later (out of scope)

Only if phases 1–4 aren't enough:

- **Web Worker:** run the update step off the main thread. Component columns are typed arrays, so they can move to `SharedArrayBuffer`. That needs cross-origin isolation headers on the dev server and any host.
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
- **Sleeping (phase 2):** a body falls asleep after the timeout and wakes on contact, joint force, mouse drag and a direct velocity change.
- **Broad phase (phase 3):** pairs before and after are the same, apart from static or sleeping pairs.

The existing tests in `tests/collision/` and `tests/systems/collision.test.ts` will need updating where they assert today's exact numbers, such as positional correction at 90% of depth per pass.

## Docs to update

Under AGENTS.md rules 3 and 4, each phase updates in the same change:

- The READMEs of every folder whose files change: `src/systems/`, `src/collisionDetectionSystem/`, `src/optimizations/broadPhase/`, `src/resources/`, `src/components/`, `src/app/`, `tests/...`.
- `engine-typescript/docs/ecs-guide.md` wherever the update order, the solver or the `Sleep` component is described.
- The Scenes section of `engine-typescript/README.md` if the benchmark's on-screen output changes (per-system times).

## Open decisions (to talk through)

1. **Position correction:** Baumgarte bias, split impulses, or a separate position pass (phase 1, step 4).
2. **Iteration count:** start at 8 velocity iterations, or tune from tests and benchmarks?
3. **Behaviour change:** is it fine for bounces and stacks to feel different, given restitution will be applied once instead of up to 25 times? If not, which current behaviour should be kept?
4. **Sleeping representation:** extend `Sleep`, or add an `Asleep` tag component that systems exclude with `without`?
5. **Sleep timeout:** about 0.5 s, or tunable per body?
6. **Islands:** part of phase 2, or a later issue?
7. **Correctness fixes:** fix the restitution NaN, friction direction and friction clamp as separate bug issues first, or inside phase 1?
8. **Targets:** is under 16.7 ms enough, or is under 8 ms the real goal?

## References

- Erin Catto, "Iterative Dynamics with Temporal Coherence" (GDC 2005) and "Fast and Simple Physics using Sequential Impulses" (GDC 2006): accumulated impulses, warm starting and Box2D-Lite.
- Box2D-Lite source: a small, readable 2D sequential-impulse solver with clipping and warm starting.
- Ian Millington, *Game Physics Engine Development*: contact generation, the resolution order and sleeping (the book this engine follows).
- *3D Math Primer for Graphics and Game Development*, 2nd edition, chapter 12: the impulse maths `resolveImpulse` already follows.
