# tests/systems

Tests for `src/systems/`.

| File                       | Purpose                                                                                                                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `collision.test.ts`        | Broad-phase pairs, the collision matrix, `touching`, contact recording, and the solver separating and resting bodies                                                                                               |
| `contactDetection.test.ts` | Manifolds for a resting box, anchors, `touching`, static pairs, material combining and defaults, and impulses carried to the next step but not to a recycled entity                                                |
| `integration.test.ts`      | Gravity, intent forces, velocity and position integration, particle integration, slow drift that is no longer snapped to zero, bodies without a sleep timer, and collider transforms                               |
| `joints.test.ts`           | Anchor helpers, spring and force joints, stretch state and joints to destroyed bodies                                                                                                                              |
| `physicsWorld.ts`          | Test helpers: a world with the demo resources, stepping the full update schedule, and position and velocity readers                                                                                                |
| `sleeping.test.ts`         | Bodies fall asleep after the timeout and stop moving, never in mid-air, never with `NeverSleep`, and not with sleeping disabled                                                                                    |
| `solverBehaviour.test.ts`  | Whole-step solver behaviour: r² bounce height, no bounce at restitution 0, sliding and holding on slopes, friction independent of restitution, overlap removed without velocity, and `touching` kept for rendering |
| `stability.test.ts`        | Solver stability over many steps: a resting box, ten- and twenty-box stacks (no sway, sink within the slop per contact), a small pyramid (90% of bodies settled), and momentum in a collision                      |
| `wind.test.ts`             | Wind force from exposure, bodies without exposure, and static bodies with exposure                                                                                                                                 |
