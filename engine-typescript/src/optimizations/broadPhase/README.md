# broadPhase

Broad-phase grids that store entity IDs by the cells their bounding boxes cover, so the solver only tests nearby pairs. Layer: physics.

| File                      | Purpose                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------- |
| `BroadPhaseGrid.ts`       | Abstract grid: per-entity cell lists, clearing, and the methods every grid provides |
| `createBroadPhaseGrid.ts` | Builds a hash or spatial grid from a `GridKind`                                     |
| `HashGrid.ts`             | Unbounded grid that hashes cell coordinates into a table of 10,000 buckets          |
| `SpatialGrid.ts`          | Fixed grid covering the world; bodies outside it are clamped to the edge cells      |
