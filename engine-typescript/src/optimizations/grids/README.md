# grids

Broad-phase grids that find the bodies near each body, so only those pairs are tested. Layer: physics.

| File             | Purpose                                                                 |
| ---------------- | ----------------------------------------------------------------------- |
| `Grid.ts`        | Abstract base class: insert bodies, clear, and query neighbors          |
| `GridFactory.ts` | Creates a grid from its kind: `"hash"` or `"spatial"`                   |
| `HashGrid.ts`    | Grid that stores occupied cells in a hash map, so its size is unbounded |
| `SpatialGrid.ts` | Fixed-size uniform grid with neighbor lookup and debug drawing          |
