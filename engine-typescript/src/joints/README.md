# joints

Joint force helpers over component data. The joints themselves are the `SpringJoint` and `ForceJoint` components, applied by `systems/JointForceSystem.ts`. Layer: physics.

| File             | Purpose                                                                                                                                       |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `jointForces.ts` | Joint helpers over component columns: `StretchState`, `anchorWorldPosition` (local anchor to world) and `addForceAtPoint` (force plus torque) |
