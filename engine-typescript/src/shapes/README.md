# shapes

Collider geometry as functions over component data: building shapes, inertia, world-space transforms and overlap tests. Layer: physics.

| File                  | Purpose                                                                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `colliderGeometry.ts` | The collider component schema and in-place functions on collider columns: world transform, translation, point-inside and bounding-box overlap |
| `colliderShapes.ts`   | Builds collider shapes (circle, rectangle, polygon) in local space, their inertia, and the values to add as a `Collider`                      |
