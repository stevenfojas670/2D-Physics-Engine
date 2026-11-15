# components

Component definitions: the data every entity is made of. Each file defines one component; `bodyFactories.ts` puts them together. Layer: physics.

| File                  | Purpose                                                                                         |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| `Acceleration.ts`     | Constant base acceleration of a particle                                                        |
| `Asleep.ts`           | Tag for a sleeping rigid body; active physics systems skip it                                   |
| `bodyFactories.ts`    | Spawns rigid bodies (sleep timer, `canSleep` option), static bodies and particles with defaults |
| `Collider.ts`         | Collision shape: local vertices, cached world vertices, normals, bounding box and touching flag |
| `CollisionGroup.ts`   | Collision group bit the collision matrix checks                                                 |
| `ForceAccumulator.ts` | Force and torque gathered during a step, cleared after integration                              |
| `ForceJoint.ts`       | Constant pull between two bodies, anchored in each body local frame                             |
| `LinearDamping.ts`    | Velocity multipliers applied once per step to rigid bodies                                      |
| `Mass.ts`             | Mass and rotational inertia with their inverses; an inverse mass of 0 means immovable           |
| `Material.ts`         | Surface bounciness and friction used when resolving contacts                                    |
| `MovementIntent.ts`   | Desired movement direction (-1 to 1 per axis) and jump, written by any controller               |
| `NeverSleep.ts`       | Tag for a rigid body that must never fall asleep, such as the player                            |
| `Particle.ts`         | Tag for point-mass particles, which have no rotation or collider                                |
| `ParticleDamping.ts`  | Fraction of particle velocity kept per second (1 means no damping)                              |
| `PlayerControlled.ts` | Tag for entities steered by the keyboard                                                        |
| `Renderable.ts`       | Outline colour used by the render systems                                                       |
| `SleepTimer.ts`       | Seconds a rigid body has stayed below the sleep thresholds                                      |
| `SpringJoint.ts`      | Spring between two bodies, anchored in each body local frame                                    |
| `Transform.ts`        | Position of the body centroid and its rotation in radians                                       |
| `Velocity.ts`         | Linear velocity and angular velocity                                                            |
| `WindExposure.ts`     | How strongly wind pushes a body; the wind force is wind times exposure                          |
