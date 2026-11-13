import { describe, expect, test } from "vitest"
import { Schedule } from "@/ecs/Schedule"
import { World } from "@/ecs/World"

describe("Schedule", () => {
	test("runs systems in insertion order with deltaTime", () => {
		const log: string[] = []
		const schedule = new Schedule()
			.add((world, deltaTime) => {
				expect(world).toBeInstanceOf(World)
				log.push(`a${deltaTime}`)
			})
			.add((world, deltaTime) => {
				expect(world).toBeInstanceOf(World)
				log.push(`b${deltaTime}`)
			})
		schedule.run(new World(), 0.5)
		expect(log).toEqual(["a0.5", "b0.5"])
	})

	test("deferred commands run after the system, before the next one", () => {
		const log: string[] = []
		const schedule = new Schedule()
			.add((world) => world.defer(() => log.push("x")))
			.add((world) => {
				expect(world.isAlive(-1)).toBe(false)
				log.push(`saw ${log.length}`)
			})
		schedule.run(new World(), 0)
		expect(log).toEqual(["x", "saw 1"])
	})
})
