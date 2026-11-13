# resources

Per-world singleton values (resources) the physics systems share. Each file defines a value type and its resource key. Layer: physics.

| File                   | Purpose                                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| `BroadPhase.ts`        | Resource key for the world's broad-phase grid                                                            |
| `CandidatePairs.ts`    | The step's deduplicated broad-phase pairs, stored flat in a growable `Uint32Array` and reused every step |
| `CollisionSettings.ts` | The collision matrix and group names for one world, with enable, disable and can-collide checks          |
| `ContactLog.ts`        | Contacts and friction arrows recorded by the solver each step, for debug drawing                         |
| `Gravity.ts`           | Gravity acceleration, default (0, 200)                                                                   |
| `MouseDrag.ts`         | The body being dragged by the mouse, its local anchor and the drag target                                |
| `WorldSize.ts`         | Width and height of the simulated world                                                                  |
