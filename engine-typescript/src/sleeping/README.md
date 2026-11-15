# sleeping

Helpers that put bodies to sleep and wake them, over component data and the sleep resources. The `sleep` system decides when bodies fall asleep; everything that wakes a body goes through these helpers. Layer: physics.

| File            | Purpose                                                                                                                                                                                                                                                                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wakeBodies.ts` | `installSleepResources`, `disturbs` (a body with no sleep timer or with a timer at 0 wakes the sleepers it touches), `fallAsleep` (zero motion, tag `Asleep`, record the group), `wakeBody` (wakes the body's whole recorded group), `wakeAllBodies` and `wakeBodiesOverlapping` (sleepers whose bounds touch a rectangle, with a 1 px margin) |
