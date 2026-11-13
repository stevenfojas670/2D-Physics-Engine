# collisionDetectionSystem

Narrow-phase collision detection and collision response. Layer: physics.

| File                    | Purpose                                                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `CollisionDetection.ts` | Tests circle–circle, polygon–polygon (separating axis with support points) and circle–polygon pairs, and returns a contact manifold |
| `CollisionManifold.ts`  | Contact data for one collision: resolves it with impulses and friction, corrects overlap, and draws the contact                     |
