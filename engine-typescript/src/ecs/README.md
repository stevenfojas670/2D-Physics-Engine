# ecs

The Entity Component System core: entities, component storage, views, the world and the schedule. It knows nothing about physics. Layer: ecs.

| File                 | Purpose                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------- |
| `ComponentStore.ts`  | The sparse set for one component: a packed entity list plus one typed-array column per field |
| `defineComponent.ts` | Declares a component as a name and a schema of typed fields, plus the column and value types |
| `Entity.ts`          | The `Entity` ID type and the functions that pack and unpack its index and generation         |
| `EntityRegistry.ts`  | Hands out entity IDs, recycles destroyed indices and tracks which IDs are still alive        |

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
