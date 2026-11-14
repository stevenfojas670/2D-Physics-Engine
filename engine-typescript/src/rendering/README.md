# rendering

Render systems that batch Canvas 2D drawing. Each system appends geometry to `DrawBatches` and `DrawFlushSystem` draws every batch at the end of the frame, so a frame costs about one draw call per colour per kind. Layer: rendering.

| File                      | Purpose                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `ColliderRenderSystem.ts` | Draws collider outlines (polygon edges, circles with a radius line) and centroid points in each body's `Renderable` colour      |
| `DebugDrawSystem.ts`      | Draws the debug layers chosen in `DebugOptions`: normals, bounding boxes, friction arrows, the mouse drag, contacts, grid cells |
| `DebugOptions.ts`         | Which debug layers are drawn; the defaults match the old engine's screen                                                        |
| `DrawBatches.ts`          | Batches lines, filled circles and stroked circles by colour, and flushes them with one draw call per batch                      |
| `DrawFlushSystem.ts`      | Flushes the batches to the canvas, stores the draw-call count and clears the batches                                            |
| `JointRenderSystem.ts`    | Draws joint lines: blue when compressed, red when stretched, orange otherwise                                                   |
| `RenderContext.ts`        | Resource holding the canvas context, the batches and the last frame's draw-call count                                           |
