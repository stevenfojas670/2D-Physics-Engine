# Entity Component System — Design

Date: 2026-11-13
Branch: `feature/ecs` (cut from `dev`)
Issue: #10

## Intent

Rebuild `engine-typescript/` around an Entity Component System (ECS). Claude writes all of the code. The owner learns by reading it, reviewing it and reading books on the side.

Why the owner wants it, in their words:

- **Performance.** The target is simulations with _thousands_ of entities. ("Millions" was an exaggeration.)
- **Learning how an ECS works.** The owner reads and reviews the code and reads books on the side.
- **Cleaner code** than today's `Simulation` god-class.
- **A solid base** for later work: AI-controlled agents (scripted, or evolved by a genetic algorithm), a user versus many AI, all-AI simulations, an editor and user customisation.

This spec covers **project 1 of 3**:

1. **ECS core and porting today's physics onto it** (this spec).
2. Agents and controllers: scripted AI, then a genetic algorithm evolving controllers, watched live. Separate spec.
3. Scale-ups when profiling asks for them: a WebGL renderer, a fixed-timestep fast mode, Web Workers. Separate spec.

### Success

- The demo scene runs on the ECS and looks and feels the same as today. Bodies fall, stack and collide. The player box moves with WASD and Space. Mouse dragging pulls bodies. Window resizing moves the walls. Debug drawing still works: outlines, centroids, normals, bounding boxes that change colour on contact, and friction arrows.
- `RigidBody`, `StaticBody`, `Simulation` and `Particle` are gone. All state lives in components; all behaviour lives in systems.
- The exceptions list in `engine-typescript/lint/layerMap.js` is **empty**. Physics no longer imports `DrawUtils` or `Controller`.
- The ECS core has unit tests, and the physics systems have tests that pin the behaviour this spec describes.
- A benchmark scene with 2,000 bodies records the physics step time, and the per-frame update and render times, on the old engine and on the ECS. Physics is no slower, rendering is clearly faster because draw calls are batched, and all numbers go in the pull request.

## Goals

1. An ECS core in `src/ecs/` using **sparse-set storage** with **struct-of-arrays typed-array columns**.
2. Components for everything a body, joint or particle holds today.
3. Systems for everything `Simulation`, `RigidBody`, `CollisionManifold`, the joints, the grids and the shapes do today.
4. A `World` with no global state, so several worlds can exist at once (project 2 needs one per agent population).
5. A movement-intent component between input and physics, so a keyboard, a script or a neural network can drive any entity the same way (the seam project 2 builds on).
6. Vitest as the test runner, with `npm run test` added to the required checks.

## Non-goals

- AI, agents and genetic algorithms (project 2).
- A WebGL or WebGPU renderer, fixed timestep, fast-forward mode, Web Workers (project 3). This project stays on the Canvas 2D API but batches its draw calls (see Batched drawing). It also records render timings, so the renderer project starts from real numbers.
- Archetype storage. Sparse sets were chosen. The `World` interface must not leak storage details, so archetypes could replace them later without changing systems.
- New physics: no new integrators, shapes, joints, buoyancy or ragdolls.
- Changes to `engine/`.
- An editor UI.

## Anti-goals (failure even if it technically works)

- **The core is a black box.** The owner wants to learn ECS internals by reading the code. A dependency (bitECS, miniplex, etc.) or clever generic code the owner can't follow defeats that.
- **Per-entity object allocation in hot loops.** If systems create `Vector2`s or component objects for every entity every step, the storage layout buys nothing.
- **Global state survives.** If `CollisionMatrix` or the grid stays module-level, two worlds can't coexist and project 2 is blocked.
- **The demo is broken mid-branch.** The old engine stays runnable until the ECS reaches parity (see Migration).

## Constraints

- Every repo rule applies: no comments, Prettier, naming, the `@/` import alias, named exports, `strict` TypeScript, folder READMEs listing every file, and architecture layers enforced by lint.
- `npm run lint`, `npm run typecheck`, `npm run build` and the new `npm run test` must pass.
- Physics, ECS and math code may not use browser globals, so a `World` can run without a canvas.
- No runtime dependencies are added. Vitest is a dev dependency only.

## Approaches considered

| Approach                                                         | Trade-off                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Fixed-capacity arrays indexed by entity ID** (bitECS style) | The simplest and very fast. But it has a hard entity cap, wastes memory on components few entities have, and teaches the least about how ECSs are usually built.                                                                                                                                                                                                                               |
| **B. Sparse sets** (EnTT style) — **chosen**                     | Each component keeps a packed array of only the entities that have it. Adding and removing components is O(1), which suits an editor and a genetic algorithm that spawn and kill agents constantly. There is no hard cap. It is moderate to write, and skypjack's _ECS back and forth_ series documents it. Multi-component views do a lookup per extra component, which is fine at thousands. |
| **C. Archetypes** (Bevy, Unity DOTS, flecs)                      | The fastest iteration. But adding or removing a component moves the entity between tables. It is the most code and the hardest to debug while learning.                                                                                                                                                                                                                                        |

The owner chose **B**.

## Who writes what

Claude writes all of the code and tests. The owner reviews.

The owner's learning goal shapes how it's written:

- **The core stays small and readable.** Each idea lives in its own file:
  - entity IDs in `EntityRegistry`;
  - the sparse set in `ComponentStore`;
  - iteration in `View`;
  - wiring in `World`;
  - ordering in `Schedule`.

  Prefer plain loops and explicit names over clever generics.

- **`src/ecs/README.md` carries a short "How it works" section** after its file table. Code comments are banned, so this README is where the explanation goes. It covers:
  - how an entity ID packs index and generation, and why generations catch stale IDs;
  - how `sparse` and `dense` map to each other and why removal swaps;
  - why columns are struct-of-arrays;
  - how a view picks the smallest store as its driver and passes slots in component order;
  - why structural changes are deferred.

  It cites skypjack's _ECS back and forth_ series for further reading.

- **The core lands as small, reviewable commits.** One concept per commit, with its tests.

## Architecture

### Layers

A new **`ecs`** layer is added. It is generic: it knows nothing about physics or vectors.

```
ecs         ecs/                                         → ecs, types
math        Vector2.ts, utils/MathHelper.ts              → math, types
physics     components/, systems/, shapes/,               → physics, ecs, math, types
            collisionDetectionSystem/, joints/,
            materials/, optimizations/
rendering   utils/DrawUtils.ts, rendering/               → rendering, physics, ecs, math, types
input       Controller.ts                                → input, types
app         main.ts, app/                                → everything
types       types/                                       → types
```

The `ecs` and `physics` layers are both browser-free (add `ecs` to `browserFreeLayers` in `eslint.config.js`). This changes the layer table in `layerMap.js` and the root README's Architecture section. It adds **no exceptions**, and the existing exceptions are deleted as their files are rewritten.

Components live in the physics layer because physics owns their meaning. Rendering may read them, which the existing `rendering → physics` rule already allows. Systems that bridge input and physics (the keyboard and the mouse) live in the app layer, which may import everything.

### Folder layout (end state)

```
src/
  ecs/                    EntityRegistry, ComponentStore, View, World, Schedule, defineComponent, defineResource
  components/             One file per component definition
  systems/                Physics systems, one file each
  shapes/                 Pure geometry functions: building collider data, inertia, world-space transforms
  collisionDetectionSystem/  Narrow-phase tests and impulse resolution as functions over component data
  joints/                 Joint force functions (spring, force)
  materials/              Default material values
  optimizations/          Collision-group definitions and the collision matrix type; grids operate on entity IDs
  rendering/              Render and debug-draw systems
  app/                    Demo scene, player input system, mouse drag system, the benchmark scene
  utils/                  MathHelper (math), DrawUtils (rendering)
  types/                  Shared type aliases
  Vector2.ts, Controller.ts, main.ts, style.css
```

Deleted by the end: `RigidBody.ts`, `StaticBody.ts`, `Simulation.ts`, `particles/` (its integration moves to a system), the `Shape`/`Circle`/`Polygon` classes (replaced by geometry functions), the `Joint`/`JointConnection`/`SpringJoint`/`ForceJoint` classes, `CollisionManifold`'s class form, and `BoundingBox`'s drawing. Folder READMEs and the root README change in the same commits.

## The ECS core (`src/ecs/`)

### Entities

- An `Entity` is a `number` that packs an **index** (low 20 bits) and a **generation** (high 12 bits, wrapping). That allows about one million live entities at once.
- `EntityRegistry` hands out indices, recycles destroyed indices through a free list, and bumps the generation on reuse. `isAlive(entity)` compares the stored generation, so a stale ID held by a joint or a genetic algorithm is detected rather than silently pointing at a new entity.
- The bit layout is exported as named constants (index bits, generation bits, masks). No magic numbers.

### Components

A component is defined once by a schema of named fields:

```ts
const Transform = defineComponent("Transform", { x: "f64", y: "f64", angle: "f64" })
const PlayerControlled = defineComponent("PlayerControlled", {})
const Collider = defineComponent("Collider", { kind: "u8", radius: "f64", localVertices: "ref", ... })
```

- Field types: `"f64"` (`Float64Array`), `"f32"`, `"i32"`, `"u32"`, `"u8"`, and `"ref"`, a plain JS array for things typed arrays can't hold: vertex lists, colour strings.
- A component with no fields is a **tag**.
- A definition is just a name, an ID and a schema. It holds no data. The data lives in the world's stores, so two worlds don't share it.

### `ComponentStore` (the sparse set)

One per component per world:

- `sparse`: maps an entity **index** to its slot in the dense arrays, or empty.
- `dense`: the packed `Entity` list, plus one packed column per schema field (struct of arrays). Slot `i` of every column belongs to `dense[i]`.
- `add(entity)` appends and returns the slot. `remove(entity)` swap-removes (moves the last slot into the hole) in O(1). `has(entity)`, `slotOf(entity)` and `size`.
- Columns grow by doubling. Systems must re-read a column reference after any operation that can grow it (see deferred commands).

Systems read and write columns by slot. They get slots from **views** (below), not by calling `slotOf` per entity.

### Views

> **Execution note (Task 10):** the callback receives the slots first and the entity **last** — `(transformSlot, velocitySlot, entity)` — and a system is `(deltaTime) => void`, bound to its world by its factory. Both changes exist because `noUnusedParameters` is on and lint forbids `_`-prefixed names, so a leading parameter a system ignores would not compile.

Querying uses EnTT-style **non-owning, uncached views**. A system builds its views once and reuses them every step:

```ts
const transforms = world.store(Transform);
const velocities = world.store(Velocity);
const movers = world.view([Transform, Velocity], { without: [Particle] });

movers.each((transformSlot, velocitySlot, entity) => {
  transforms.x[transformSlot] += velocities.x[velocitySlot] * deltaTime;
});
```

- **What a view holds:** direct references to its stores (the included and the excluded ones), resolved once when it is built. It holds no entity list of its own, so it never goes stale. Entities added or removed between steps show up or drop out on their own.
- **`each(callback)`:**
  - On every call, it picks the **smallest** included store as the driver.
  - It walks the driver's dense entities **from the end to the start**, so destroying the current entity mid-loop is safe.
  - For each entity, it reads the sparse slot from every other included store, skipping the entity if any is missing. It also skips the entity if any excluded store has it.
  - It calls `callback(entity, ...slots)` with one slot per included component, **in the order the components were listed**. The driver's slot is the loop index, so it costs no lookup.
- **Typing:** TypeScript tuple types give the callback exactly one numeric slot parameter per included component. This is the one place in the core that uses non-trivial generics. Keep it to that one type.
- **Other methods:**
  - `contains(entity)`;
  - `slot(entity, Component)` for one-off lookups, such as a joint reading its two bodies;
  - `size()`, which is the driver's size and an upper bound;
  - `find(predicate)`, which returns the first matching entity or none, for loops that need to stop early, such as mouse picking.
- **No allocation** per `each` call or per entity. The callback is the system's own function, created once with the view, not a new closure every step.
- **Naming rule for callbacks:** slot parameters are named after their component (`transformSlot`, `velocitySlot`). Slots arrive by position, and the names are the guard against mixing them up.
- **Columns are read through the store** (`transforms.x[...]`), never cached as a local array across a step, because growth replaces the arrays.
- **Out of scope:** cached views, which keep their own entity list updated on every add and remove, and groups, which reorder stores so matches share slots. Groups keep the same `each` shape, so if the benchmark ever calls for them (project 3), systems don't change.

Trade-offs considered against the first draft's `world.query()` + `slotOf` design:

|                                    | Query + `slotOf`                                  | View (chosen)                                                    |
| ---------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------- |
| Lookups per entity, two components | 3                                                 | 1                                                                |
| Store resolution                   | Every call                                        | Once                                                             |
| Looping                            | Iterator: harder to keep fast and allocation-free | Callback: simple and fast, but no `break`, so `find` covers that |
| Readability                        | Explicit lookups                                  | Positional slots, guarded by the naming rule                     |
| Path to groups                     | All systems change                                | Contained in the view                                            |

### `World`

- Owns the `EntityRegistry`, one `ComponentStore` per component definition (created lazily on first use), and a resource table.
- `createEntity()`, `destroyEntity(entity)` (removes it from every store), `add(entity, Component, values?)`, `remove(entity, Component)`, `has`, `store(Component)`, `view(components, { without })`.
- **Resources** are per-world singletons, defined with `defineResource<T>(name)` and accessed with `world.resource(Key)` and `world.setResource(Key, value)`. Gravity, the collision matrix, the broad-phase grid, the world size, the contact list, debug-draw options, controller keys and the mouse state are all resources.
- **Deferred commands:** `world.defer(command)` queues structural changes (create, destroy, add, remove on other entities) made while a view is iterating. The `Schedule` flushes them after each system.

### `Schedule`

An ordered list of systems. A system is a plain function `(world: World, deltaTime: number) => void`, or a small object holding its own scratch buffers. `schedule.run(world, deltaTime)` runs the systems in order and flushes deferred commands after each. `main.ts` runs two schedules per frame: **update**, then **render**.

## Components (`src/components/`)

All numeric fields are `f64` unless stated. "Per step" values keep today's semantics.

| Component          | Fields                                                                                                                                                                                                             | Replaces                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `Transform`        | `x`, `y` (centroid), `angle` (radians)                                                                                                                                                                             | Vertex positions baked into `Shape`                                                   |
| `Velocity`         | `x`, `y`, `angular`                                                                                                                                                                                                | `RigidBody.velocity`, `angularVelocity`                                               |
| `ForceAccumulator` | `x`, `y`, `torque`                                                                                                                                                                                                 | `forceAccumulator`, `torqueAccumulator`                                               |
| `Mass`             | `mass`, `inverseMass`, `inertia`, `inverseInertia`                                                                                                                                                                 | `RigidBody` mass fields. `inverseMass` of 0 means immovable, replacing `isKinematic`. |
| `Material`         | `restitution`, `friction`                                                                                                                                                                                          | `Material` class (defaults 0.5 and 0.1)                                               |
| `Collider`         | `kind` (`u8`: circle or polygon), `radius`, `localVertices` (ref: `Float64Array` of x,y pairs around the centroid), `worldVertices` (ref), `worldNormals` (ref), `minX`, `minY`, `maxX`, `maxY`, `touching` (`u8`) | `Shape`, `Circle`, `Polygon`, `BoundingBox`                                           |
| `CollisionGroup`   | `group` (`u32` bitmask)                                                                                                                                                                                            | `RigidBody.collisionGroup`, `StaticBody.collisionGroup`                               |
| `LinearDamping`    | `linear`, `angular` (multiplier per step, default 0.999)                                                                                                                                                           | The hard-coded 0.999 in `RigidBody.integrate`                                         |
| `Sleep`            | `linearThreshold`, `angularThreshold` (default 0.01)                                                                                                                                                               | `RigidBody` sleep thresholds                                                          |
| `Particle`         | tag                                                                                                                                                                                                                | `Particle` class (it has no rotation and no inertia)                                  |
| `Acceleration`     | `x`, `y`                                                                                                                                                                                                           | `Particle.acceleration` (constant base acceleration)                                  |
| `ParticleDamping`  | `perSecond` (default 1, no damping)                                                                                                                                                                                | `Particle.damping`, semantics from PR #11                                             |
| `SpringJoint`      | `entityA`, `entityB` (`u32`), `anchorAX`, `anchorAY`, `anchorBX`, `anchorBY` (local to each body), `springConstant`, `restLength`, `stretchState` (`u8`, for colour)                                               | `SpringJoint`, `JointConnection`, shape anchor IDs                                    |
| `ForceJoint`       | `entityA`, `entityB`, the four local anchors, `strength`                                                                                                                                                           | `ForceJoint`                                                                          |
| `Renderable`       | `color` (ref string, default `"black"`)                                                                                                                                                                            | `Shape.color`                                                                         |
| `PlayerControlled` | tag                                                                                                                                                                                                                | The hard-coded `rigidBodies[4]` in `pollMovement`                                     |
| `MovementIntent`   | `x`, `y` (desired direction, each −1..1), `jump` (`u8`)                                                                                                                                                            | Direct `addForce` calls in `pollMovement`                                             |

Anchors are stored **in the body's local frame**, so they follow the body through `Transform` with no anchor bookkeeping. This removes the anchor map from `Shape`.

Static bodies are entities with `Transform`, `Collider`, `CollisionGroup`, `Renderable` and `Mass` with zero inverse mass and inertia. With no `Velocity`, the integration systems skip them.

## Systems

### Update schedule (in order)

| #   | System                       | Layer   | Does                                                                                                                                                                                                                                                                              |
| --- | ---------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `PlayerInputSystem`          | app     | Reads the `Controller` keys resource. Writes `MovementIntent` on `PlayerControlled` entities.                                                                                                                                                                                     |
| 2   | `MouseDragSystem`            | app     | On press, picks the entity under the mouse using the grid resource and point-in-collider. Stores the entity and a local anchor in the mouse-drag resource. While held, adds force `mouse − anchorWorld` at the anchor (force plus torque). On release, clears.                    |
| 3   | `IntentForceSystem`          | physics | Converts `MovementIntent` into force with today's numbers: `moveSpeed × force` = 5 × 100 on each axis; `jump` adds an extra upward force × 10.                                                                                                                                    |
| 4   | `GravitySystem`              | physics | Adds `gravity × mass` to every entity with `ForceAccumulator` and non-zero `inverseMass`. Gravity resource defaults to (0, 200).                                                                                                                                                  |
| 5   | `JointForceSystem`           | physics | Spring and force joints add force at their anchors. The force-halving rule is the same as today: full force if the other body is immovable. Updates `stretchState`. Skips joints whose bodies are no longer alive.                                                                |
| 6   | `RigidBodyIntegrationSystem` | physics | Semi-implicit Euler on `Transform` and `Velocity` from `ForceAccumulator` and `Mass`. Then damping per step, then sleep thresholds, then it clears the accumulator. Skips `Particle`.                                                                                             |
| 7   | `ParticleIntegrationSystem`  | physics | The PR #11 semantics: base `Acceleration` plus force × inverse mass, damping by `perSecond ^ deltaTime`, and the accumulator cleared.                                                                                                                                             |
| 8   | `ColliderTransformSystem`    | physics | Recomputes `worldVertices`, `worldNormals` and the AABB from `localVertices` and `Transform`. It only recomputes normals when the angle changed. Clears `touching`.                                                                                                               |
| 9   | `BroadPhaseSystem`           | physics | Refreshes the grid resource with every collider's AABB. Produces a **deduplicated** list of unordered candidate pairs that pass the collision matrix and AABB overlap.                                                                                                            |
| 10  | `CollisionSolverSystem`      | physics | 25 iterations. Each iteration, for each candidate pair: run the narrow phase, then apply positional correction (90%) and impulse resolution with restitution and friction, exactly as today. Records contacts and friction tangents into the contacts resource for debug drawing. |

`touching` keeps today's meaning: the broad phase sets it on both colliders when their AABBs overlap and the collision matrix allows the pair. A narrow-phase hit isn't required.

Particles have no `Collider` in project 1. They don't collide, which matches today, where particles are never added to the grid. They may have a `Renderable`, and `ColliderRenderSystem` doesn't draw them; a particle renderer belongs with the particle-system goal. The rigid-body integration, broad phase and solver views exclude `Particle`.

Ordering note: today gravity and keyboard forces are added _after_ integration, so they apply one step later than mouse forces. The ECS applies all forces before integration. The one-step shift is invisible in the demo and is accepted.

Pairs note: today each pair is resolved from both sides, and more than once when the bodies share several grid cells. The ECS resolves each unordered pair once per iteration. Stacking may feel slightly stiffer. That is accepted, as long as the demo still looks and feels the same.

The other two grid kinds keep working: the hash grid and the spatial grid. Both store entity IDs instead of `RigidBody` references. `resizeWorld` becomes a `WorldSize` resource update, plus repositioning the four boundary entities, which the demo scene keeps handles to.

### Render schedule

| System                             | Layer         | Draws                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ColliderRenderSystem`             | rendering     | Collider outlines (polygon edges, circle stroke with radius line), centroid points, in `Renderable.color`                                                                                                                                                                                                                                    |
| `DebugDrawSystem`                  | rendering     | Driven by a debug-options resource whose defaults match today's screen. **On:** polygon normals, AABBs coloured by `touching`, friction tangent arrows, mouse-drag line and anchor. **Off, but available:** contact points and normals, which today's code has but never calls, and grid cells, which today's default hash grid never draws. |
| `JointRenderSystem`                | rendering     | Joint lines coloured by `stretchState` (blue, red or orange as today)                                                                                                                                                                                                                                                                        |
| `FpsSystem` (or kept in `main.ts`) | rendering/app | FPS text                                                                                                                                                                                                                                                                                                                                     |

`DrawUtils` stops being a static singleton holding `ctx`. Rendering systems get the context through a resource set by `main.ts`. This keeps physics free of the canvas for good.

### Batched drawing

Today every `DrawUtils` call does its own `beginPath()` and `stroke()` or `fill()`. One box with debug drawing costs about 10 draw calls, so 2,000 bodies cost over 20,000 per frame. The render systems batch instead:

- Each frame, the render systems add their geometry to **batches keyed by colour and kind**: stroked lines, filled points and stroked circles. A batch is one `Path2D`, or one open path, per key. Drawing appends `moveTo`/`lineTo`/`arc` to the batch for that colour.
- After all render systems run, a final **flush** sets `strokeStyle`/`fillStyle` once per batch and calls `stroke()` or `fill()` once per batch. A frame becomes a handful of draw calls, roughly one per colour per kind, no matter how many bodies there are.
- The batch store is a rendering resource. It's reused every frame (cleared, not reallocated), and no per-body objects are created. The flush is the last system in the render schedule.
- Arrowheads, normals, AABBs, centroids, joint lines and the mouse-drag line all go through batches. Text (the FPS counter) is drawn directly, because it's one call.
- **Draw order:** within one frame, batches flush in a fixed order (fills, then strokes, in a fixed colour order). Overlapping shapes may layer differently than today's draw-as-you-go. That's accepted: everything is outlines on a flat background.
- `DrawUtils` becomes the batching helper: append-to-batch functions plus the flush, taking the batch resource rather than a static `ctx`.

How batches are stored (`Path2D` objects or raw coordinate arrays traced at flush) is the builder's call, picked with the render benchmark below.

## Shapes and collision as functions

- `shapes/` exports pure functions: `createRectangleCollider(width, height)`, `createCircleCollider(radius)`, `createPolygonCollider(localVertices)`, `polygonInertia(mass, localVertices)`, `circleInertia(mass, radius)`, `transformVertices(...)`, `computeNormals(...)`, `computeBounds(...)`, `isPointInsideCollider(...)`. Inertia formulas are unchanged.
- `collisionDetectionSystem/` keeps today's algorithms: SAT for polygons, circle-vs-circle, circle-vs-polygon edges and corners, contact point. They are rewritten to read collider world data, and return results into reusable scratch objects rather than new `CollisionManifold`s per test.
- Impulse resolution and positional correction become functions that take the world, the two entities and the contact. The math is unchanged, apart from removing the inline `DrawUtils.drawArrow` (now a recorded contact).
- Hot loops use scalar arithmetic on columns. `Vector2` stays for setup code, the API and tests.

## World-level state that moves out of globals

- `CollisionGroups` stays a constant list of the eight group bits. Group display names become a per-world resource, so they're no longer mutated globally.
- `CollisionMatrix` becomes a per-world resource with `enableCollision(a, b)`, `disableCollision(a, b)` and `canCollide(a, b)`. These replace the `Simulation` methods.
- `Controller` stays in the input layer as a plain key-state object. `main.ts` owns it and exposes it to the world as a resource.
- The per-step `console.log` calls in `RigidBody` (`log()`, `addForceAtPoint`) and `Shape` anchors are dropped. They print every body every frame and would swamp the benchmark.

## Demo scene (`app/DemoScene.ts`)

It rebuilds today's `Simulation` constructor as entities:

- Four boundary walls (immovable rectangles, thickness 50) sized to the world.
- A 40×40 dynamic box at (300, 420), mass 1, group 1, `PlayerControlled`.
- A 100×400 immovable rectangle at (300, 300).
- A 50×100 static rectangle at (200, 200), see "Calls made" below.
- Collision between group 1 and group 2 disabled. Group names "Kinematic Objects" and "Static Objects".
- `spawnObject` (rectangle 100×50 mass 10, circle radius 50 mass 10) and `createStressTestPyramid` are kept as functions over the world.

## Benchmark (`app/BenchmarkScene.ts`)

- A scene with **2,000 dynamic bodies** (a mix of circles and boxes from the stress-test pyramid, scaled up) inside the boundary walls.
- It measures the average physics step time over a fixed number of steps, with rendering excluded. It runs without a canvas, as a Vitest benchmark or a small script; that choice is the builder's.
- The scene is a pyramid of circles and boxes, built by a scene function with a fixed layout so both engines get identical bodies.
- **Old-engine baseline.** As written, the old engine can't produce a fair, canvas-free number:
  - `RigidBody` logs every body every step.
  - `CollisionManifold` draws through `DrawUtils` on every contact.
  - `Simulation` always builds the demo scene and hides its body list.

  So the baseline is measured on a **throwaway branch** `test/ecs-baseline-benchmark`, cut from `dev`, which is never merged. That branch:
  - removes the `console.log` calls;
  - points `DrawUtils.ctx` at a no-op stub;
  - adds a way to build the benchmark scene instead of the demo.

  `feature/ecs` never touches the old classes for this.

- **Render timing.** Rendering needs a real canvas, so it's measured in the browser:
  - Opening the dev server with `?scene=benchmark` loads the benchmark scene instead of the demo.
  - After a warm-up, it measures the average **update** time and **render** time separately, using `performance.now()` around each schedule over a fixed number of frames.
  - It shows both on screen next to the FPS counter.
  - It records the draw-call count per frame by counting batch flushes.

  The throwaway baseline branch measures the old engine's `Simulation.update` and `Simulation.draw` the same way, with logging removed. Real drawing stays on in the baseline, because that's what's being compared.

- All numbers are recorded in the pull request, with the machine and the browser or Node version:
  - physics step (headless), old and new;
  - update and render per frame (browser), old and new;
  - draw calls per frame, new only.

  Goals: physics is no slower, and render is clearly faster because of batching. Most of the remaining step cost is expected in the 25-iteration solver. Big physics speed-ups, and moving off the Canvas 2D API to WebGL or WebGPU, belong to project 3, which starts from these render numbers.

## Testing

- Vitest is added as a dev dependency, with an `npm run test` script. The test command is added to AGENTS.md rule 2, the CONTRIBUTING checklist and the PR template.
- Tests live in `engine-typescript/tests/`, mirroring `src/`. Each test folder gets a README like every other folder. Test files follow every lint rule and are type-checked by `npm run typecheck`.
- **ECS core tests**, written before each piece (test-first):
  - Entity IDs are unique while alive. Destroyed indices are reused with a bumped generation. Stale IDs report not alive. Generations wrap.
  - Store: add, remove, has and slot. Swap-remove keeps the other entities' data intact. Columns grow past their initial capacity without losing data.
  - View:
    - includes and excludes correctly, and `without` works;
    - gives the same results whichever store is smallest;
    - passes slots in the order the components were listed, and they point at the right data;
    - destroying the current entity during `each` is safe;
    - sees entities added or removed between calls;
    - `find` stops at the first match;
    - `each` allocates nothing. Unit tests can't measure this reliably, so code review and a flat heap during the benchmark check it.
  - World: stores and resources are independent between two worlds. Destroy removes the entity from every store. Deferred commands apply after the system.
- **Physics tests:**
  - Integration: a free body under gravity matches semi-implicit Euler by hand. Damping and sleep behave as today. Immovable bodies don't move.
  - Particle integration covers the PR #11 cases (velocity kept with no damping, a one-step force applied once, frame-rate-independent damping).
  - Narrow phase: circle-circle, polygon-polygon and circle-polygon hit and miss with known depth and normal.
  - Solver: two boxes overlapping get separated. A box resting on the floor stays at rest.
  - Collision matrix: disabled groups don't collide, and two worlds' matrices are independent.
  - Joints: a stretched spring pulls its bodies together, and a joint to a destroyed entity is skipped.
- Manual check: run `npm run dev` and compare the demo against the old engine side by side before deleting it.

## Migration

The old engine keeps running until the ECS reaches parity:

0. After PR #11 (particle damping) merges into `dev`, merge `dev` into `feature/ecs`. `ParticleIntegrationSystem` ports those semantics.
1. Add Vitest and the `ecs` layer. Build the ECS core test-first, one concept per commit, including the `src/ecs/README.md` explanation.
2. Add components, shape functions, collision functions and systems in their new folders, alongside the old classes. The old classes stay untouched.
3. Add the demo scene and the render systems. Switch `main.ts` to the ECS once parity is checked. Record the old engine's benchmark number before this step.
4. Delete the old classes, empty the exceptions list, update the folder READMEs, the root README's Architecture and Known exceptions sections, and the layer map.

Every commit passes lint, typecheck, build and test.

## Calls made in this spec (owner please check)

- **Static rectangle now collides.** Today's `StaticBody` at (200, 200) is drawn but never collides. The ECS makes static bodies immovable colliders, which looks like the intent. Say if it should stay draw-only.
- **Pairs are resolved once per iteration,** not from both sides. Stacking may be slightly stiffer.
- **All forces apply before integration.** Gravity and keyboard forces no longer lag one step.
- **The new `ecs` layer** and the reshaped layer table. No exceptions are added.
- **Tests live in `tests/`,** not next to the source files.
- **Per-step `console.log` calls are removed.**
- **Rigid-body damping stays per step** (0.999), unlike particles, to keep the demo feeling the same.
- **Debug drawing defaults match today's screen.** Contacts and grid cells are off; `touching` means the boxes overlap and the collision matrix allows the pair.
- **Particles don't collide and aren't drawn** in project 1, as today.
- **The old-engine benchmark** runs on a throwaway, never-merged branch that strips logging and stubs drawing.
- **The explanation of the core lives in `src/ecs/README.md`,** because code comments are banned.
- **Batched drawing may layer overlapping outlines differently** from today, because batches flush in a fixed order.

## Left to the builder

- Initial store capacity and the growth details.
- Whether `ref` columns hold per-entity `Float64Array`s or offsets into one shared vertex pool.
- File names inside each folder, within the naming rules.
- How the benchmark is run (a Vitest bench or a Node script).
- Small helpers and factories for spawning bodies (`spawnRigidBody(world, collider, mass, ...)`).
