# tests/ecs

Tests for the ECS core in `src/ecs/`.

| File                     | Purpose                                                                                |
| ------------------------ | -------------------------------------------------------------------------------------- |
| `ComponentStore.test.ts` | Adding, overwriting, swap-removal, stale IDs, growth and clearing in the sparse set    |
| `EntityRegistry.test.ts` | Entity ID packing, unique IDs, index reuse with generations, wraparound                |
| `View.test.ts`           | Inclusion, exclusion, slot order, driver choice, safe removal mid-loop, `find`, limits |
