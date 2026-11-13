# optimizations

Ways to avoid testing every pair of bodies for collision. Layer: physics.

| File                 | Purpose                                                                   |
| -------------------- | ------------------------------------------------------------------------- |
| `CollisionGroups.ts` | Bitmask collision groups and the matrix that decides which groups collide |

## Folders

- [`boundingVolumes/`](boundingVolumes/README.md) — Simple shapes that enclose a body for cheap overlap tests
- [`grids/`](grids/README.md) — Broad-phase grids that find nearby bodies
