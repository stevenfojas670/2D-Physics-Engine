# tests/systems

Tests for `src/systems/`.

| File                       | Purpose                                                                                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `collision.test.ts`        | Broad-phase pairs, the collision matrix, `touching`, contact recording, and the solver separating and resting bodies                                                |
| `contactDetection.test.ts` | Manifolds for a resting box, anchors, `touching`, static pairs, material combining and defaults, and impulses carried to the next step but not to a recycled entity |
| `integration.test.ts`      | Gravity, intent forces, rigid-body and particle integration, sleep, and collider transforms                                                                         |
| `joints.test.ts`           | Anchor helpers, spring and force joints, stretch state and joints to destroyed bodies                                                                               |
| `physicsWorld.ts`          | Test helpers: a world with the demo resources, stepping the full update schedule, and position and velocity readers                                                 |
| `stability.test.ts`        | Solver stability over many steps: a resting box, a ten-box stack, a small pyramid, and momentum in a collision                                                      |
| `wind.test.ts`             | Wind force from exposure, bodies without exposure, and static bodies with exposure                                                                                  |
