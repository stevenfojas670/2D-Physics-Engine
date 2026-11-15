# app

Wiring between the browser, input and the ECS: input resources and systems, the demo, benchmark and sandbox scenes, the update and render schedules, and frame timing. Layer: app.

| File                   | Purpose                                                                                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `BenchmarkScene.ts`    | Builds the 2,000-body benchmark: a fixed 1600×1000 world with walls and a pyramid of radius-6 circles and 12×12 boxes, and the settled window's 1,800-frame warm-up                                    |
| `ControllerKeys.ts`    | Resource key for the keyboard state (`Controller.keys`)                                                                                                                                                |
| `DemoScene.ts`         | Builds the demo scene and its world resources, resizes its walls (waking every sleeper), spawns demo objects and the stress-test pyramid                                                               |
| `FixedStep.ts`         | Turns variable frame times into a whole number of fixed 1/60 s steps, carrying the remainder and capping steps per frame so a slow frame can't spiral                                                  |
| `FrameTimer.ts`        | Averages update time, render time and draw calls over a fixed number of frames after a warm-up, and per-system times through a `SystemTimer`                                                           |
| `MouseDragSystem.ts`   | Picks the body under the held mouse, then pulls it toward the mouse at its anchor and keeps it awake; ends the drag on release or when it's gone                                                       |
| `MouseInput.ts`        | Resource holding the mouse position and whether the left button is held                                                                                                                                |
| `PlayerInputSystem.ts` | Turns held keys into `MovementIntent` on `PlayerControlled` entities                                                                                                                                   |
| `SandboxScene.ts`      | Builds the wind sandbox: a fixed 1200×700 world with floor and ceiling, wind-exposed bodies, and a respawn system that replaces bodies leaving either side through deferred commands and `destroyBody` |
| `sceneSelection.ts`    | Reads the `scene` query parameter (`demo`, `benchmark` or `sandbox`, defaulting to `demo`) and the benchmark's `window` (`collapse` or `settled`, defaulting to `collapse`)                            |
| `schedules.ts`         | Builds the update schedule (input, forces, integration, collision, sleeping) and the render schedule (draw systems, then the flush), naming each system                                                |
| `SystemTimer.ts`       | Averages each named system's time over a fixed number of frames after a warm-up, slowest first, with each one's share of the total                                                                     |
