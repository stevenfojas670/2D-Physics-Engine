# optimizations

Ways to avoid testing every pair of bodies for collision. Layer: physics.

| File                 | Purpose                                                                   |
| -------------------- | ------------------------------------------------------------------------- |
| `CollisionGroups.ts` | Bitmask collision groups and the matrix that decides which groups collide |

## Folders

- [`broadPhase/`](broadPhase/README.md) — Entity-based broad-phase grids that find nearby bodies
