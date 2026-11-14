# systems

Physics systems. Each file exports a factory `createXSystem(world)` that builds its views once and returns a `System` to add to a `Schedule`. Layer: physics.

| File                            | Purpose                                                                                                                                                                                       |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BroadPhaseSystem.ts`           | Refills the broad-phase grid from collider bounds and builds the step's candidate pairs, each unordered pair once, filtered by the collision matrix                                           |
| `ColliderTransformSystem.ts`    | Recomputes each collider's world vertices, bounds and (when rotated) normals from its transform, and clears `touching`                                                                        |
| `CollisionSolverSystem.ts`      | 25 solver iterations over the candidate pairs: marks `touching`, runs the narrow phase, corrects positions and resolves impulses; records contacts and friction arrows on the first iteration |
| `GravitySystem.ts`              | Adds gravity times mass to every movable body's force accumulator                                                                                                                             |
| `IntentForceSystem.ts`          | Turns `MovementIntent` into force: 500 per axis, plus ten times that upward for a jump                                                                                                        |
| `JointForceSystem.ts`           | Applies spring and force joints at their anchors, sets each spring's `stretchState`, and skips joints whose bodies are gone                                                                   |
| `ParticleIntegrationSystem.ts`  | Integrates particles: base acceleration plus force, damping per second, accumulator cleared                                                                                                   |
| `RigidBodyIntegrationSystem.ts` | Semi-implicit Euler for rigid bodies, then per-step damping and sleep thresholds, accumulator cleared                                                                                         |
| `WindSystem.ts`                 | Adds wind times exposure to the force accumulator of every body with `WindExposure`; bodies without a force accumulator are skipped                                                           |
