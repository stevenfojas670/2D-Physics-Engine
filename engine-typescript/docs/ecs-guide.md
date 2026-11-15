# Building with the ECS

How to add entities, components, resources, systems and scenes to this engine. Read this before changing anything under `src/`. For how the ECS works inside (sparse sets, generations, how views pick a driver) see [`src/ecs/README.md`](../src/ecs/README.md); this guide only covers how to use it.

Every example is real code from `src/`. The worked example in section 9 is the sandbox scene (`/?scene=sandbox`), which you can run and change.

## 1. Entities

- An entity is a number: an index plus a generation. It holds no data.
- `world.createEntity()` makes one. `world.destroyEntity(entity)` removes it from every store and frees its index. Destroying a dead entity does nothing.
- A destroyed entity's index is reused with a new generation, so an old ID becomes **stale**. `world.isAlive(entity)` is false for it, and `world.add` throws `Cannot add <Component> to entity <id>: it is not alive`. Check `isAlive` before using an ID you stored earlier (a joint end, a drag target).
- Store entity IDs, never slots (see section 2).

```ts
const pullDraggedBody = (drag: MouseDrag, mouse: MouseInput): void => {
	const transformSlot = transforms.slotOf(drag.entity)
	if (!world.isAlive(drag.entity) || transformSlot === -1) {
		drag.active = false
		return
	}
```

From `src/app/MouseDragSystem.ts`.

## 2. Components

- Define each component once, in its own file in `src/components/`, with `defineComponent(name, schema)`. The file name matches the component.
- Schema field types: `"f64"`, `"f32"`, `"i32"`, `"u32"`, `"u8"`, or `ref<T>()` for values a typed array can't hold (strings, vertex lists). Use `0`/`1` in a `"u8"` for flags. A schema of `{}` is a **tag**: it marks an entity and holds no data.
- `world.add(entity, Component, values?)` adds the component, or overwrites the given fields if the entity already has it. Fields you leave out start at `0` (or `undefined` for a `ref`). It returns the entity's **slot** in that store.
- `world.has(entity, Component)` and `world.remove(entity, Component)` do what they say.
- **A slot is never kept across a structural change.** Adding or removing any component, or destroying any entity, can move other entities' slots, because removal swaps the last slot into the hole. Look slots up again (`store.slotOf(entity)`, or the slots a view passes you) every time.

```ts
const WindExposure = defineComponent("WindExposure", {
	exposure: "f64",
})
```

```ts
const Renderable = defineComponent("Renderable", { color: ref<string>() })
const Particle = defineComponent("Particle", {})
```

## 3. Reading and writing data

- Data is stored as one array per field: `world.store(Transform).columns.x` holds every `x`. Read and write it as `columns.x[slot]`.
- In a system, capture `world.store(X).columns` **once**, in the factory. Never capture `columns.x` itself: when a store grows, `ComponentStore` replaces the arrays inside `columns`, so a captured `columns.x` would go stale. The `columns` object stays the same.
- Outside a system, `world.store(X)` gives `slotOf(entity)` (`-1` when missing), `size` and `entityAt(slot)`.

```ts
const forces = world.store(ForceAccumulator).columns
const exposures = world.store(WindExposure).columns
```

From `src/systems/WindSystem.ts`.

## 4. Body factories

Spawn bodies through `src/components/bodyFactories.ts` instead of adding components one by one. Each returns the new entity; add your own components afterwards.

| Factory                                                              | Adds                                                                                                                                                                                 | Defaults                                                                                                                                                                                 |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `spawnRigidBody(world, shape, x, y, mass, options?)` with `mass > 0` | `Transform`, `Collider`, `CollisionGroup`, `Material`, `Renderable`, `Mass`, `Velocity`, `ForceAccumulator`, `LinearDamping`, `SleepTimer`, plus `NeverSleep` with `canSleep: false` | angle 0; group `GROUP0`; default restitution and friction from `materials/materialDefaults.ts`; colour `"black"`; linear and angular damping 0.999; sleep time 0; inertia from the shape |
| `spawnStaticBody(world, shape, x, y, options?)`                      | `Transform`, `Collider`, `CollisionGroup`, `Material`, `Renderable`, `Mass`                                                                                                          | the same, with mass and inverse mass 0. No `Velocity`, `ForceAccumulator`, `LinearDamping` or `SleepTimer`, so force systems skip it                                                     |
| `spawnParticle(world, x, y, mass, options?)`                         | `Transform`, `Velocity`, `ForceAccumulator`, `Mass`, `Particle`, `Acceleration`, `ParticleDamping`                                                                                   | no collider, no rotation; acceleration 0; damping 1 (none)                                                                                                                               |

`options` for rigid and static bodies is `{ group?, color? }`; for particles it is `{ damping?, accelerationX?, accelerationY? }`. Shapes come from `createCircleShape(radius)` and `createRectangleShape(width, height)` in `src/shapes/colliderShapes.ts`.

```ts
const body = spawnRigidBody(world, shape, x, y, BODY_MASS)
world.add(body, WindExposure, { exposure })
```

From `src/app/SandboxScene.ts`.

## 5. Views

- `world.view([A, B, …], { without: [C, …] })` matches entities that have every listed component and none of the `without` ones.
- Build views **once**, in a system's factory, and reuse them every step. A view holds no entity list, so it never goes stale.
- `view.each(callback)` calls `callback(slotA, slotB, …, entity)`: one slot per listed component, **in the order you listed them**, then the entity. Leave off trailing parameters you don't use (most systems never need the entity).
- Define the callback once, outside the step, so running the system allocates nothing. Pass per-step values (like `deltaTime` or a resource) through variables the callback captures.
- `view.find(predicate)` returns the first entity the predicate accepts, or `undefined`. `view.contains(entity)` checks one entity. `view.slot(entity, Component)` gives that entity's slot for one listed component.

```ts
const bodies = world.view([Velocity, ForceAccumulator, Mass, LinearDamping], {
	without: [Particle, Asleep],
})
```

From `src/systems/VelocityIntegrationSystem.ts`; its callback takes four slots in that order.

## 6. Resources

- A resource is a value the whole world shares, with exactly one per world: gravity, wind, the world size, the broad-phase grid, the canvas.
- Use a resource for one value many systems read. Use a component for a value each entity has its own copy of.
- Declare the key with `defineResource<T>(name)` in its own file, exported as `<Name>Resource` next to the value's type and any default. Physics resources go in `src/resources/`; app-only ones (input) in `src/app/`; rendering ones in `src/rendering/`.
- `world.setResource(key, value)` sets it, `world.resource(key)` reads it and throws `Missing resource <name>` if nothing set it, and `world.hasResource(key)` checks.
- Read resources **inside the step**, not in the factory, so a scene can replace them later (the sandbox replaces the wind after `installWorldResources` sets the default).
- Who installs what: `main.ts` sets the input and rendering resources (`ControllerKeysResource`, `MouseInputResource`, `RenderContextResource`, `DebugOptionsResource`). `installWorldResources` in `src/app/DemoScene.ts` sets the physics ones (`WorldSizeResource`, `GravityResource`, `WindResource`, `CollisionSettingsResource`, `BroadPhaseResource`, `ContactsResource`, `MouseDragResource`, `SolverSettingsResource`, `SleepSettingsResource`). Every scene calls it. `BroadPhaseSystem` creates `CandidatePairsResource` itself.

```ts
interface Wind {
	x: number
	y: number
}

const DEFAULT_WIND: Readonly<Wind> = { x: 0, y: 0 }

const WindResource = defineResource<Wind>("Wind")
```

From `src/resources/Wind.ts`.

## 7. Systems and schedules

- A system is a function `(deltaTime: number) => void`. Write it as a factory, `createXSystem(world: World): System`, in a file named `XSystem.ts`.
- The factory captures `columns`, builds views and defines callbacks. The function it returns is the step: read resources, then run the views.
- Where it lives: physics systems in `src/systems/` (layer physics: no browser globals, no imports from app or rendering); draw systems in `src/rendering/`; systems that read input in `src/app/`.
- Add it to a schedule in `src/app/schedules.ts` with a unique name, such as `.add("wind", createWindSystem(world))`; the name labels its time in the benchmark. `Schedule.run` calls the systems in the order they were added and flushes deferred commands after each one (section 8).

```ts
function createWindSystem(world: World): System {
	const forces = world.store(ForceAccumulator).columns
	const exposures = world.store(WindExposure).columns
	const exposedBodies = world.view([ForceAccumulator, WindExposure])
	let windX = 0
	let windY = 0

	const applyWind = (forceSlot: number, exposureSlot: number): void => {
		const exposure = exposures.exposure[exposureSlot]
		forces.x[forceSlot] += windX * exposure
		forces.y[forceSlot] += windY * exposure
	}

	return () => {
		const wind = world.resource(WindResource)
		windX = wind.x
		windY = wind.y
		exposedBodies.each(applyWind)
	}
}
```

**The update schedule** (`createUpdateSchedule`), in order:

| #   | System                      | Why it is here                                                                                                    |
| --- | --------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1   | `WorldChangeWakeSystem`     | Wakes every sleeper when gravity, wind, the collision matrix or `SleepSettings.enabled` changed since last step   |
| 2   | `PlayerInputSystem`         | Turns keys into `MovementIntent` before anything reads it                                                         |
| 3   | `MouseDragSystem`           | Adds the drag force and keeps the held body awake; needs last step's broad-phase grid to pick a body              |
| 4   | `IntentForceSystem`         | Turns `MovementIntent` into force                                                                                 |
| 5   | `GravitySystem`             | Adds gravity force                                                                                                |
| 6   | `WindSystem`                | Adds wind force                                                                                                   |
| 7   | `JointForceSystem`          | Adds spring and joint forces from current positions                                                               |
| 8   | `VelocityIntegrationSystem` | Turns all forces into velocity and clears them; every force system must run before it                             |
| 9   | `ParticleIntegrationSystem` | Integrates particles in one go; they don't collide                                                                |
| 10  | `BroadPhaseSystem`          | Finds candidate pairs from last step's final collider bounds                                                      |
| 11  | `ContactDetectionSystem`    | Runs the narrow phase once per pair and stores the contact manifolds; treats sleepers as immovable and wakes them |
| 12  | `IslandSystem`              | Groups awake bodies linked by contacts and joints into islands for sleeping                                       |
| 13  | `VelocitySolveSystem`       | Warm-starts the contacts, then fixes velocities with sequential impulses                                          |
| 14  | `PseudoVelocitySolveSystem` | Pushes overlapping bodies apart through pseudo-velocities that never become real motion                           |
| 15  | `PositionIntegrationSystem` | Moves bodies by velocity plus pseudo-velocity                                                                     |
| 16  | `ColliderTransformSystem`   | Moves colliders to the final positions, for rendering and next step's broad phase                                 |
| 17  | `SleepSystem`               | Counts how long each body has been still and puts it to sleep after the timeout                                   |

**The render schedule** (`createRenderSchedule`): `ColliderRenderSystem`, `JointRenderSystem`, `DebugDrawSystem` each add to the draw batches, then `DrawFlushSystem` draws them, so it must be last.

A new force system goes anywhere after `MouseDragSystem` (3) and before `VelocityIntegrationSystem` (8), because velocity integration consumes and clears the forces. Give it `without: [Asleep]` so sleepers stay still. Anything that needs final positions for the frame goes after 16, or in the render schedule.

## 8. Deferred commands

- Inside `each` you may change component **fields** freely, and you may destroy or remove components from the **current** entity (the loop walks backwards, so the entity swapped into its slot was already visited).
- Destroying **other** entities, or removing components from them, inside `each` swaps other entities into their slots, so the walk can skip an entity or visit one twice. Spawning entities or adding components to other entities appends to the stores mid-walk, so whether the view sees them this pass depends on store order. Defer all of these, so every system sees a settled world.
- `world.defer((world) => { … })` queues a command. The schedule runs the queue after the current system finishes, in order, including commands queued while flushing. Outside a schedule, call `world.flushDeferred()` yourself.
- Read what the command needs (positions, field values) **before** deferring; slots may have moved by the time it runs. Capture entity IDs, never slots.

```ts
const exposure = exposures.exposure[exposureSlot]
const index = respawnCount
const y = RESPAWN_FIRST_Y + (index % RESPAWN_ROWS) * RESPAWN_ROW_SPACING
respawnCount++
world.defer((deferredWorld) => {
	destroyBody(deferredWorld, entity)
	spawnSandboxBody(deferredWorld, index, RESPAWN_X, y, exposure)
})
```

From `createSandboxRespawnSystem` in `src/app/SandboxScene.ts`.

## 9. Sleeping

Bodies that stay still are taken out of the step until something disturbs them. Design and reasons: Phase 2 of `superpowers/specs/2026-11-13-physics-performance-design.md`.

- **Pieces:** the `Asleep` tag (the body sleeps), the `NeverSleep` tag (it may never sleep), the `SleepTimer` component (seconds it has been still) and the `SleepSettings` resource (`enabled`, `linearThreshold` 1 px/s, `angularThreshold` 0.035 rad/s, `timeout` 0.5 s). `spawnRigidBody` adds `SleepTimer` to every movable body; `canSleep: false` adds `NeverSleep`.
- **Active systems skip sleepers** with `without: [Asleep]`. A sleeper's world vertices and bounds stay valid because it doesn't move. Contact detection treats it as immovable.
- **Waking** goes through `src/sleeping/wakeBodies.ts`. `wakeBody(world, entity)` resets the timer at once and defers removing `Asleep` from every body that fell asleep with it. Contacts, joints, mouse drag and movement intent call it already.
- **Code that sets a body's velocity, position or force directly calls `wakeBody`** after doing so, or a sleeper ignores the change.
- **Code that changes the world without motion uses `src/sleeping/worldEdits.ts`:** `destroyBody` instead of `world.destroyEntity` for bodies, `moveStaticBody` to move a static body, and `setCollisionGroup` to change a body's group. Changing the gravity, wind or collision matrix resources needs no call: `WorldChangeWakeSystem` wakes everything.

## 10. Worked example: wind

Wind was added to the engine in four steps; follow the same steps for any new force.

1. **Resource** `src/resources/Wind.ts`: the `Wind` type, `DEFAULT_WIND` and `WindResource` (section 6).
2. **Component** `src/components/WindExposure.ts`: how strongly wind pushes each body (section 2).
3. **System** `src/systems/WindSystem.ts`: for every entity with `ForceAccumulator` and `WindExposure`, add `wind × exposure` to the force (section 7). Static bodies have no `ForceAccumulator`, so the view skips them.
4. **Wire it in:** `installWorldResources` sets `WindResource` to `DEFAULT_WIND`, so every world has it, and `createUpdateSchedule` adds `.add("wind", createWindSystem(world))` right after gravity.

Tests: `tests/systems/wind.test.ts` runs the system on its own; `tests/app/app.test.ts` checks the default wind and that the update schedule applies it. Update the READMEs of every folder you touched.

## 11. Adding a scene

1. Write `buildXScene(world)` in `src/app/XScene.ts`. Call `installWorldResources(world, width, height)` first, replace any resources the scene changes, then spawn bodies with the factories.
2. Put scene-only systems in the same file as factories, like `createSandboxRespawnSystem`.
3. Add the name to `SceneName` and `SELECTABLE_SCENES` in `src/app/sceneSelection.ts`, and a branch in `src/main.ts` that sizes the canvas, builds the scene and appends any scene-only systems with `update.add("name", system)` (they run after the solver).
4. Test it in `tests/app/app.test.ts`: what the scene builds, and what its own systems do.
5. Add a row to the Scenes table in [`engine-typescript/README.md`](../README.md#scenes) with the address, what it shows and the controls (AGENTS.md rule 4), and a row to `src/app/README.md`.

```ts
function buildSandboxScene(world: World): void {
	installWorldResources(world, SANDBOX_WIDTH, SANDBOX_HEIGHT)
	world.setResource(WindResource, { x: SANDBOX_WIND.x, y: SANDBOX_WIND.y })
	spawnFloorAndCeiling(world)
	for (let index = 0; index < SANDBOX_BODY_COUNT; index++) {
		const column = index % BODY_COLUMNS
		const row = Math.floor(index / BODY_COLUMNS)
		spawnSandboxBody(
			world,
			index,
			FIRST_BODY_X + column * BODY_SPACING,
			FIRST_BODY_Y + row * BODY_SPACING,
			EXPOSURES[index % EXPOSURES.length],
		)
	}
}
```
