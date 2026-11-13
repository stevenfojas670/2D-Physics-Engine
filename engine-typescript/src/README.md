# src

Engine source code. Imports across folders use the `@/` alias. Each file belongs to one architecture layer (see `lint/layerMap.js`).

| File            | Purpose                                                                                                                                                                                                                                                                             |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Controller.ts` | Tracks which movement keys (WASD, Q, E, Space) are held. Layer: input                                                                                                                                                                                                               |
| `Vector2.ts`    | 2D vector class with in-place operations, copying operations and free helper functions. Layer: math                                                                                                                                                                                 |
| `main.ts`       | Entry point: builds the ECS world and its resources, the demo scene (or the benchmark scene with `?scene=benchmark`), input listeners and the animation loop that runs the update and render schedules; draws the FPS counter and, for the benchmark, the frame timings. Layer: app |
| `style.css`     | Page and canvas layout                                                                                                                                                                                                                                                              |

## Folders

- [`app/`](app/README.md) — Input systems, the demo and benchmark scenes, schedules and frame timing
- [`components/`](components/README.md) — Component definitions and body factories
- [`ecs/`](ecs/README.md) — Entity Component System core: entities, component stores, views, world and schedule
- [`collisionDetectionSystem/`](collisionDetectionSystem/README.md) — Narrow-phase collision tests and contact resolution over component data
- [`joints/`](joints/README.md) — Joint force helpers over component data
- [`materials/`](materials/README.md) — Default surface properties of bodies
- [`optimizations/`](optimizations/README.md) — Collision groups and entity-based broad-phase grids
- [`rendering/`](rendering/README.md) — Render systems that batch Canvas 2D drawing
- [`resources/`](resources/README.md) — Per-world shared values used by the physics systems
- [`shapes/`](shapes/README.md) — Collider geometry as functions over component data
- [`systems/`](systems/README.md) — Physics systems that run each step
- [`types/`](types/README.md) — Shared type aliases
- [`utils/`](utils/README.md) — Math helpers
