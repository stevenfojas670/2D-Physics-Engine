# ecs

The Entity Component System core: entities, component storage, views, the world and the schedule. It knows nothing about physics. Layer: ecs.

| File                 | Purpose                                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| `ComponentStore.ts`  | The sparse set for one component: a packed entity list plus one typed-array column per field    |
| `defineResource.ts`  | Declares a typed key for a per-world singleton value (a resource)                               |
| `defineComponent.ts` | Declares a component as a name and a schema of typed fields, plus the column and value types    |
| `Entity.ts`          | The `Entity` ID type and the functions that pack and unpack its index and generation            |
| `EntityRegistry.ts`  | Hands out entity IDs, recycles destroyed indices and tracks which IDs are still alive           |
| `Schedule.ts`        | An ordered list of systems; runs them and applies deferred changes after each                   |
| `View.ts`            | Iterates the entities that have a set of components, passing each component's slot              |
| `World.ts`           | Owns the entity registry, one store per component, the resources and the deferred-command queue |

## How it works

### Entity IDs

An entity is just a number. Its low 20 bits are an **index** (a slot number, so up to about one million live entities) and its high 12 bits are a **generation**.

When an entity is destroyed, its index goes on a free list and the registry bumps that index's generation. The next `create()` reuses the index with the new generation. Anything still holding the old ID, such as a joint or a genetic algorithm's list of agents, now holds a number whose generation no longer matches, so `isAlive` reports it as dead instead of silently pointing at the new entity. After 4,096 reuses of one index the generation wraps back to 0.

### Components and the sparse set

A component is declared once with `defineComponent(name, schema)`. The schema maps field names to a storage type: `"f64"`, `"f32"`, `"i32"`, `"u32"`, `"u8"`, or `ref<T>()` for values a typed array can't hold, such as vertex lists or colour strings. A component with no fields is a tag. The definition holds no data; each world creates its own `ComponentStore` per component.

A `ComponentStore` is a **sparse set**: two arrays that point at each other.

- `sparse` is indexed by entity index and holds that entity's **slot**, or -1.
- `dense` is packed: slot `i` holds the entity at that slot, and slot `i` of every column holds that entity's data.

`has` and `slotOf` are one lookup in `sparse` plus a check that `dense` agrees, which also rejects stale generations. Adding appends at the end. Removing **swaps** the last slot into the hole, so the dense arrays never have gaps and removal is O(1). The price is that slots move, so code never keeps a slot across structural changes.

The data is **struct of arrays**: one `Float64Array` holds every `x`, another every `y`, and so on, instead of one object per entity. Looping over a field walks memory in order and creates no garbage. Columns double in size when full, and the arrays are replaced when that happens, so systems always read them through `store.columns`.

### Views

A view answers "which entities have all of these components, and none of those?" A system builds its views once and reuses them every step:

```ts
const movers = world.view([Transform, Velocity], { without: [Particle] })
movers.each((transformSlot, velocitySlot, entity) => { ... })
```

`each` picks the **smallest** included store as the driver, because every entity in the answer must be in it. It walks the driver's dense array **from the end to the start**, so if the callback removes the current entity, the entity swapped into its slot has already been visited. For each entity it looks up the slot in every other included store and skips the entity if one is missing or an excluded store has it. The callback gets one slot per component, **in the order the components were listed**, followed by the entity; the driver's slot is free because it is the loop counter. The entity comes last because most systems never need it and can simply leave it off, which TypeScript's unused-parameter check requires.

The view holds no entity list of its own (it is _uncached_), so it never goes stale: entities added or removed between steps simply show up or drop out. `each` allocates nothing. `find` is `each` that stops at the first entity the predicate accepts, and `contains` and `slot` answer one-off questions.

Bigger engines add _groups_, which reorder stores so matching entities share the same slot everywhere and need no lookups. They keep the same `each` shape, so they could replace this later without changing systems.

### World and resources

`World` ties the pieces together. It owns one `EntityRegistry` and one `ComponentStore` per component definition, created the first time anything asks for it, including when a view is built, so a view made before any entity has the component still sees it later. `destroyEntity` removes the entity from every store before freeing its ID.

**Resources** are per-world singletons: gravity, the collision settings, the broad-phase grid, the canvas context. Each has a typed key made by `defineResource<T>(name)`; `world.resource(key)` reads it and throws `Missing resource <name>` if nothing set it. Keeping them in the world, not in module globals, is what lets two worlds run side by side.

### Schedule and deferred commands

A system is a function `(deltaTime) => void`. Systems are built by factories (`createGravitySystem(world)`) that capture their world and make their views and callbacks once, so running a system each step allocates nothing.

`Schedule` is an ordered list of systems, and `run` calls them in order. A system in the middle of `each` must not add or remove components on _other_ entities, because that moves slots in the stores the view is walking. Instead it calls `world.defer(command)`. After each system finishes, the schedule calls `world.flushDeferred()`, which runs the queued commands in order, including any queued while flushing. The order is fixed and written in one place, so every run of the simulation is deterministic.

### Further reading

Michele Caini's (skypjack) _ECS back and forth_ series explains sparse sets, views and groups in depth; this core follows its design.
