import { expect, test } from "vitest"
import { World } from "@/ecs/World"
import {
	BENCHMARK_SETTLED_WARMUP_FRAMES,
	buildBenchmarkScene,
} from "@/app/BenchmarkScene"
import { ControllerKeysResource } from "@/app/ControllerKeys"
import { MouseInputResource, createMouseInput } from "@/app/MouseInput"
import { SystemTimer } from "@/app/SystemTimer"
import { createUpdateSchedule } from "@/app/schedules"
import type { Schedule } from "@/ecs/Schedule"
import { Asleep } from "@/components/Asleep"
import { SleepTimer } from "@/components/SleepTimer"

const STEP = 1 / 60
const WARMUP_STEPS = 120
const SAMPLE_STEPS = 300
const BENCH_TIME_MS = 5000
const PER_SYSTEM_TIMEOUT_MS = 240_000
const SETTLE_LIMIT_STEPS = 3600
const SETTLED_SHARE = 0.95
const SHARE_LOG_INTERVAL = 600

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

function readClock(): number {
	return performance.now()
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

function asleepShare(world: World): number {
	return world.store(Asleep).size / world.store(SleepTimer).size
}

function printSystemTimes(world: World, update: Schedule): void {
	const timer = new SystemTimer(update.names, 0, SAMPLE_STEPS)
	for (let step = 0; step < SAMPLE_STEPS; step++) {
		update.runTimed(world, STEP, readClock, timer.recordSystem)
		timer.endFrame()
	}
	const systems = timer.summary
	expect(systems).not.toBeNull()
	const rows = (systems ?? []).map((system) => ({
		system: system.name,
		ms: system.milliseconds.toFixed(3),
		share: `${(system.share * 100).toFixed(1)}%`,
	}))
	const totalMs = (systems ?? []).reduce(
		(total, system) => total + system.milliseconds,
		0,
	)
	rows.push({ system: "total", ms: totalMs.toFixed(3), share: "100.0%" })
	console.table(rows)
	console.log(
		`asleep after the sample: ${(asleepShare(world) * 100).toFixed(1)}%`,
	)
}

function warmedUp(steps: number): [World, Schedule] {
	const world = benchmarkWorld()
	const update = createUpdateSchedule(world)
	for (let step = 0; step < steps; step++) {
		update.run(world, STEP)
	}
	return [world, update]
}

test("per-system step times", { timeout: PER_SYSTEM_TIMEOUT_MS }, () => {
	const [world, update] = warmedUp(WARMUP_STEPS)
	printSystemTimes(world, update)
})

test(
	"per-system step times, settled",
	{ timeout: PER_SYSTEM_TIMEOUT_MS },
	() => {
		const [world, update] = warmedUp(BENCHMARK_SETTLED_WARMUP_FRAMES)
		printSystemTimes(world, update)
	},
)

test(
	"steps until the pyramid sleeps",
	{ timeout: PER_SYSTEM_TIMEOUT_MS },
	() => {
		const world = benchmarkWorld()
		const update = createUpdateSchedule(world)
		let bestShare = 0
		let bestStep = 0
		for (let step = 1; step <= SETTLE_LIMIT_STEPS; step++) {
			update.run(world, STEP)
			const share = asleepShare(world)
			if (step % SHARE_LOG_INTERVAL === 0) {
				console.log(`step ${step}: ${(share * 100).toFixed(1)}% asleep`)
			}
			if (share > bestShare) {
				bestShare = share
				bestStep = step
			}
			if (share >= SETTLED_SHARE) {
				break
			}
		}
		console.log(
			`best asleep share ${(bestShare * 100).toFixed(1)}% at step ${bestStep}`,
		)
		expect(bestShare).toBeGreaterThan(0)
	},
)
