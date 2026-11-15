# resources

Per-world singleton values (resources) the physics systems share. Each file defines a value type and its resource key. Layer: physics.

| File                   | Purpose                                                                                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BroadPhase.ts`        | Resource key for the world's broad-phase grid                                                                                                                    |
| `CandidatePairs.ts`    | The step's deduplicated broad-phase pairs, stored flat in a growable `Uint32Array` and reused every step                                                         |
| `CollisionSettings.ts` | The collision matrix and group names for one world, with enable, disable and can-collide checks                                                                  |
| `ContactLog.ts`        | Contacts and friction arrows recorded by the solver each step, for debug drawing                                                                                 |
| `ContactManifolds.ts`  | The step's contact manifolds in flat typed-array columns (up to two points each), with last step's impulses kept by entity pair and feature ID for warm starting |
| `Gravity.ts`           | Gravity acceleration, default (0, 200)                                                                                                                           |
| `MouseDrag.ts`         | The body being dragged by the mouse, its local anchor and the drag target                                                                                        |
| `PseudoVelocities.ts`  | Split-impulse pseudo-velocities indexed by `Velocity` slot: they move bodies during the step and are discarded after it                                          |
| `SleepingIslands.ts`   | Members of each group of bodies that fell asleep together, so waking one wakes the group                                                                         |
| `SleepSettings.ts`     | World-wide sleeping switch, speed thresholds and timeout, with the spec defaults                                                                                 |
| `SolverSettings.ts`    | Solver iteration counts, split-impulse beta and slop, and the restitution threshold, with the spec defaults                                                      |
| `Wind.ts`              | Wind force per unit of exposure, default (0, 0)                                                                                                                  |
| `WorldSize.ts`         | Width and height of the simulated world                                                                                                                          |
