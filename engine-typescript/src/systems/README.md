# systems

Physics systems. Each file exports a factory `createXSystem(world)` that builds its views once and returns a `System` to add to a `Schedule`. Layer: physics.

| File                            | Purpose                                                                                                                     |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `ColliderTransformSystem.ts`    | Recomputes each collider's world vertices, bounds and (when rotated) normals from its transform, and clears `touching`      |
| `GravitySystem.ts`              | Adds gravity times mass to every movable body's force accumulator                                                           |
| `IntentForceSystem.ts`          | Turns `MovementIntent` into force: 500 per axis, plus ten times that upward for a jump                                      |
| `JointForceSystem.ts`           | Applies spring and force joints at their anchors, sets each spring's `stretchState`, and skips joints whose bodies are gone |
| `ParticleIntegrationSystem.ts`  | Integrates particles: base acceleration plus force, damping per second, accumulator cleared                                 |
| `RigidBodyIntegrationSystem.ts` | Semi-implicit Euler for rigid bodies, then per-step damping and sleep thresholds, accumulator cleared                       |
