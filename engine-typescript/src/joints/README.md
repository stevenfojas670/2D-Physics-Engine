# joints

Constraints that connect two rigid bodies. Layer: physics.

| File                 | Purpose                                                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `ForceJoint.ts`      | Pulls the connected bodies together with a constant strength                                                                                  |
| `Joint.ts`           | Abstract base class for joints; holds the connection and cannot be constructed directly                                                       |
| `JointConnection.ts` | The two bodies a joint links, their anchor points and the line color; draws the link                                                          |
| `jointForces.ts`     | Joint helpers over component columns: `StretchState`, `anchorWorldPosition` (local anchor to world) and `addForceAtPoint` (force plus torque) |
| `SpringJoint.ts`     | Hooke's-law spring between the connected bodies                                                                                               |
