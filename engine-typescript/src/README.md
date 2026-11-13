# src

Engine source code. Imports across folders use the `@/` alias. Each file belongs to one architecture layer (see `lint/layerMap.js`).

| File            | Purpose                                                                                                                                                                                            |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Controller.ts` | Tracks which movement keys (WASD, Q, E, Space) are held. Layer: input                                                                                                                              |
| `RigidBody.ts`  | Dynamic body: mass, inertia, forces, torque, material, collision group and the integrators that step it. Layer: physics                                                                            |
| `Simulation.ts` | World manager: holds bodies, applies gravity, runs broad- and narrow-phase collision with iterative solving, handles mouse dragging and player movement, and builds the demo scene. Layer: physics |
| `StaticBody.ts` | Immovable body: a shape plus a collision group. Layer: physics                                                                                                                                     |
| `Vector2.ts`    | 2D vector class with in-place operations, copying operations and free helper functions. Layer: math                                                                                                |
| `main.ts`       | Entry point: sets up the canvas, input listeners and the animation loop, and draws the FPS counter. Layer: app                                                                                     |
| `style.css`     | Page and canvas layout                                                                                                                                                                             |

## Folders

- [`collisionDetectionSystem/`](collisionDetectionSystem/README.md) — Narrow-phase collision tests and collision response
- [`joints/`](joints/README.md) — Constraints that connect two rigid bodies
- [`materials/`](materials/README.md) — Surface properties of bodies
- [`optimizations/`](optimizations/README.md) — Collision filtering, broad-phase grids and bounding volumes
- [`particles/`](particles/README.md) — Point-mass particles
- [`shapes/`](shapes/README.md) — Geometry of bodies
- [`types/`](types/README.md) — Shared type aliases
- [`utils/`](utils/README.md) — Math helpers and canvas drawing helpers
