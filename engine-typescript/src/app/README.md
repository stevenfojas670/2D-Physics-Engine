# app

Wiring between the browser, input and the ECS: input resources and systems, the demo and benchmark scenes, the update and render schedules, and frame timing. Layer: app.

| File                   | Purpose                                                                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `BenchmarkScene.ts`    | Builds the 2,000-body benchmark: a fixed 1600×1000 world with walls and a pyramid of radius-6 circles and 12×12 boxes         |
| `ControllerKeys.ts`    | Resource key for the keyboard state (`Controller.keys`)                                                                       |
| `DemoScene.ts`         | Builds the demo scene and its world resources, resizes its walls, spawns demo objects and the stress-test pyramid             |
| `FrameTimer.ts`        | Averages update time, render time and draw calls over a fixed number of frames after a warm-up                                |
| `MouseDragSystem.ts`   | Picks the body under the held mouse, then pulls it toward the mouse at its anchor; ends the drag on release or when it's gone |
| `MouseInput.ts`        | Resource holding the mouse position and whether the left button is held                                                       |
| `PlayerInputSystem.ts` | Turns held keys into `MovementIntent` on `PlayerControlled` entities                                                          |
| `schedules.ts`         | Builds the update schedule (input, forces, integration, collision) and the render schedule (draw systems, then the flush)     |
