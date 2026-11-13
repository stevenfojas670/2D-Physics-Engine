# shapes

Geometry of bodies: vertices, centroid, normals, inertia and drawing. Layer: physics.

| File                  | Purpose                                                                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `colliderGeometry.ts` | The collider component schema and in-place functions on collider columns: world transform, translation, point-inside and bounding-box overlap |
| `colliderShapes.ts`   | Builds collider shapes (circle, rectangle, polygon) in local space, their inertia, and the values to add as a `Collider`                      |
| `Circle.ts`           | Circle: inertia, bounding box, point-inside test and drawing                                                                                  |
| `Cone.ts`             | Cone shape (not yet implemented)                                                                                                              |
| `Polygon.ts`          | Convex polygon: inertia, rotation and drawing                                                                                                 |
| `Rectangle.ts`        | Four-vertex polygon built from a center, width and height                                                                                     |
| `Shape.ts`            | Abstract base class: vertices, centroid, normals, anchor points, bounding box, move and rotate                                                |
