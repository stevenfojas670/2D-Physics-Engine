import { describe, expect, test } from "vitest"
import { defineComponent } from "@/ecs/defineComponent"
import { defineResource } from "@/ecs/defineResource"
import { World } from "@/ecs/World"

const Position = defineComponent("Position", { x: "f64", y: "f64" })
const Frozen = defineComponent("Frozen", {})
const Speed = defineResource<number>("Speed")

describe("World", () => {
	test("two worlds do not share component data or resources", () => {
		const first = new World()
		const second = new World()
		const entity = first.createEntity()
		first.add(entity, Position, { x: 3 })
		first.setResource(Speed, 1)
		second.setResource(Speed, 2)
		expect(second.store(Position).size).toBe(0)
		expect(first.resource(Speed)).toBe(1)
		expect(second.resource(Speed)).toBe(2)
	})

	test("destroyEntity removes the entity from every store", () => {
		const world = new World()
		const entity = world.createEntity()
		world.add(entity, Position)
		world.add(entity, Frozen)
		world.destroyEntity(entity)
		expect(world.isAlive(entity)).toBe(false)
		expect(world.store(Position).size).toBe(0)
		expect(world.store(Frozen).size).toBe(0)
	})

	test("add, has and remove work through the world", () => {
		const world = new World()
		const entity = world.createEntity()
		const slot = world.add(entity, Position, { y: 4 })
		expect(world.store(Position).columns.y[slot]).toBe(4)
		expect(world.has(entity, Position)).toBe(true)
		expect(world.remove(entity, Position)).toBe(true)
		expect(world.has(entity, Position)).toBe(false)
	})

	test("add through a stale entity throws and leaves the reused index intact", () => {
		const world = new World()
		const stale = world.createEntity()
		world.add(stale, Position)
		world.destroyEntity(stale)
		const live = world.createEntity()
		world.add(live, Position, { x: 7 })
		expect(() => world.add(stale, Position)).toThrow(/not alive/)
		world.remove(stale, Position)
		expect(world.has(live, Position)).toBe(true)
		expect(world.store(Position).size).toBe(1)
		expect(
			world.store(Position).columns.x[world.store(Position).slotOf(live)],
		).toBe(7)
	})

	test("view without excludes components", () => {
		const world = new World()
		const moving = world.createEntity()
		const frozen = world.createEntity()
		world.add(moving, Position)
		world.add(frozen, Position)
		world.add(frozen, Frozen)
		const seen: number[] = []
		world
			.view([Position], { without: [Frozen] })
			.each((positionSlot, entity) => {
				expect(positionSlot).toBeGreaterThanOrEqual(0)
				seen.push(entity)
			})
		expect(seen).toEqual([moving])
	})

	test("view built before any store exists sees later entities", () => {
		const world = new World()
		const view = world.view([Position])
		const entity = world.createEntity()
		world.add(entity, Position)
		expect(view.size()).toBe(1)
	})

	test("resource throws a named error when missing", () => {
		expect(() => new World().resource(Speed)).toThrow("Missing resource Speed")
	})

	test("hasResource reports whether a resource is set", () => {
		const world = new World()
		expect(world.hasResource(Speed)).toBe(false)
		world.setResource(Speed, 5)
		expect(world.hasResource(Speed)).toBe(true)
	})

	test("deferred commands wait for a flush and run in order", () => {
		const world = new World()
		const log: string[] = []
		world.defer(() => log.push("first"))
		world.defer(() => log.push("second"))
		expect(log).toEqual([])
		world.flushDeferred()
		expect(log).toEqual(["first", "second"])
	})

	test("commands deferred during a flush also run", () => {
		const world = new World()
		const log: string[] = []
		world.defer((current) => current.defer(() => log.push("nested")))
		world.flushDeferred()
		expect(log).toEqual(["nested"])
	})
})
