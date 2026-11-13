# collisionDetectionSystem

Narrow-phase collision detection and collision response. Layer: physics.

| File                    | Purpose                                                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `BodyColumns.ts`        | Bundles the transform, velocity, mass, material and collider stores that contact resolution reads and writes                        |
| `CollisionDetection.ts` | Tests circle–circle, polygon–polygon (separating axis with support points) and circle–polygon pairs, and returns a contact manifold |
| `CollisionManifold.ts`  | Contact data for one collision: resolves it with impulses and friction, corrects overlap, and draws the contact                     |
| `Contact.ts`            | Reusable scratch result of a collision test: depth, normal from A to B, and contact point                                           |
| `narrowPhase.ts`        | Exact collision tests on collider data (circle, polygon, mixed) that write into a `Contact` without allocating                      |

## References

`CollisionManifold.resolveCollision` follows _3D Math Primer for Graphics and Game Development_ (2nd edition), chapter 12, "Mechanics 2: Linear and Rotational Dynamics":

- 12.2.2 Frictional Forces: the friction impulse
- 12.4.2 General Collision Response: the linear impulse
- 12.5 Rotational Dynamics: angular velocity at the contact point
