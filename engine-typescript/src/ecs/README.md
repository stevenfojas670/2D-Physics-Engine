# ecs

The Entity Component System core: entities, component storage, views, the world and the schedule. It knows nothing about physics. Layer: ecs.

| File                | Purpose                                                                               |
| ------------------- | ------------------------------------------------------------------------------------- |
| `Entity.ts`         | The `Entity` ID type and the functions that pack and unpack its index and generation  |
| `EntityRegistry.ts` | Hands out entity IDs, recycles destroyed indices and tracks which IDs are still alive |

## How it works

### Entity IDs

An entity is just a number. Its low 20 bits are an **index** (a slot number, so up to about one million live entities) and its high 12 bits are a **generation**.

When an entity is destroyed, its index goes on a free list and the registry bumps that index's generation. The next `create()` reuses the index with the new generation. Anything still holding the old ID, such as a joint or a genetic algorithm's list of agents, now holds a number whose generation no longer matches, so `isAlive` reports it as dead instead of silently pointing at the new entity. After 4,096 reuses of one index the generation wraps back to 0.
