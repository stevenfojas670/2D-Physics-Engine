# collisionDetectionSystem

Narrow-phase collision detection and collision response over component data. Layer: physics.

| File                   | Purpose                                                                                                                                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BodyColumns.ts`       | Bundles the transform, velocity, mass, material and collider stores that contact detection reads                                                                                                                                      |
| `ContactManifold.ts`   | Reusable scratch result of a collision test: the normal from A to B and up to two contact points, each with a depth and a feature ID                                                                                                  |
| `narrowPhase.ts`       | Exact collision tests on collider data that write a `ContactManifold` without allocating: one point for circle pairs, and up to two for polygon pairs by clipping the incident edge against the reference edge                        |
| `sequentialImpulse.ts` | Solver passes over stored manifolds: effective masses and bounce targets, warm starting, velocity passes with accumulated and clamped normal and Coulomb friction impulses, split-impulse pseudo-velocity passes, and friction arrows |

## References

`sequentialImpulse.ts` follows Erin Catto's sequential-impulse solver (Box2D-Lite and "Fast and Simple Physics using Sequential Impulses", GDC 2006): accumulated, clamped impulses and warm starting. The polygon clipping in `narrowPhase.ts` follows Box2D-Lite's `Collide`. The split impulses follow Bullet's `btSequentialImpulseConstraintSolver` (push and turn velocities).
