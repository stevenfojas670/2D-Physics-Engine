# joints

Constraints that connect two rigid bodies. Layer: physics.

| File                 | Purpose                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------- |
| `ForceJoint.ts`      | Pulls the connected bodies together with a constant strength                            |
| `Joint.ts`           | Abstract base class for joints; holds the connection and cannot be constructed directly |
| `JointConnection.ts` | The two bodies a joint links, their anchor points and the line color; draws the link    |
| `SpringJoint.ts`     | Hooke's-law spring between the connected bodies                                         |
