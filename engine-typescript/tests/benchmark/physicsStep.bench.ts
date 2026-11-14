import { test } from "vitest"
import { World } from "@/ecs/World"
import { buildBenchmarkScene } from "@/app/BenchmarkScene"
import { ControllerKeysResource } from "@/app/ControllerKeys"
import { MouseInputResource, createMouseInput } from "@/app/MouseInput"
import { createUpdateSchedule } from "@/app/schedules"

const STEP = 1 / 60
const WARMUP_STEPS = 120
const BENCH_TIME_MS = 5000

function benchmarkWorld(): World {
	const world = new World()
	buildBenchmarkScene(world)
	world.setResource(ControllerKeysResource, {
		KeyW: false,
		KeyA: false,
		KeyS: false,
		KeyD: false,
		KeyQ: false,
		KeyE: false,
		Space: false,
	})
	world.setResource(MouseInputResource, createMouseInput())
	return world
}

test("physics step", async ({ bench }) => {
	const world = benchmarkWorld()
	const update = createUpdateSchedule(world)
	for (let step = 0; step < WARMUP_STEPS; step++) {
		update.run(world, STEP)
	}
	await bench("ecs physics step, 2000 bodies", () => {
		update.run(world, STEP)
	}).run({ time: BENCH_TIME_MS })
})
