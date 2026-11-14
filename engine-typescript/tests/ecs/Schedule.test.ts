import { describe, expect, test } from "vitest"
import { Schedule } from "@/ecs/Schedule"
import { World } from "@/ecs/World"

describe("Schedule", () => {
	test("runs systems in insertion order with deltaTime", () => {
		const log: string[] = []
		const schedule = new Schedule()
			.add("a", (deltaTime) => log.push(`a${deltaTime}`))
			.add("b", (deltaTime) => log.push(`b${deltaTime}`))
		schedule.run(new World(), 0.5)
		expect(log).toEqual(["a0.5", "b0.5"])
	})

	test("deferred commands run after the system, before the next one", () => {
		const world = new World()
		const log: string[] = []
		const schedule = new Schedule()
			.add("a", () => world.defer(() => log.push("x")))
			.add("b", () => log.push(`saw ${log.length}`))
		schedule.run(world, 0)
		expect(log).toEqual(["x", "saw 1"])
	})

	test("names include systems added later", () => {
		const schedule = new Schedule().add("a", () => {}).add("b", () => {})
		schedule.add("c", () => {})
		expect(schedule.names).toEqual(["a", "b", "c"])
	})

	test("add rejects a duplicate name", () => {
		const schedule = new Schedule().add("a", () => {})
		expect(() => schedule.add("a", () => {})).toThrow("Duplicate system name a")
	})

	test("runTimed counts the deferred flush toward the system that queued it", () => {
		const world = new World()
		let now = 0
		const timings: [number, number][] = []
		const schedule = new Schedule()
			.add("a", () => {
				now += 2
				world.defer(() => {
					now += 1
					world.defer(() => {
						now += 4
					})
				})
			})
			.add("b", () => {
				now += 5
			})
		schedule.runTimed(
			world,
			0,
			() => now,
			(index, milliseconds) => timings.push([index, milliseconds]),
		)
		expect(timings).toEqual([
			[0, 7],
			[1, 5],
		])
	})

	test("runTimed passes deltaTime and keeps order", () => {
		const log: string[] = []
		const schedule = new Schedule()
			.add("a", (deltaTime) => log.push(`a${deltaTime}`))
			.add("b", (deltaTime) => log.push(`b${deltaTime}`))
		schedule.runTimed(
			new World(),
			0.5,
			() => 0,
			() => {},
		)
		expect(log).toEqual(["a0.5", "b0.5"])
	})
})
