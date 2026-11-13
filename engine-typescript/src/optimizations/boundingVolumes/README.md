# boundingVolumes

Simple shapes that enclose a body for cheap overlap tests. Layer: physics.

| File                | Purpose                                                               |
| ------------------- | --------------------------------------------------------------------- |
| `BoundingBox.ts`    | Axis-aligned bounding box with an intersection test and debug drawing |
| `BoundingVolume.ts` | Abstract base class: collision state, intersection test and drawing   |
| `ConvexHull.ts`     | Convex hull bounding volume (not yet implemented)                     |
