import { describe, expect, test } from "vitest"
import {
	ENTITY_GENERATION_MASK,
	entityGeneration,
	entityIndex,
	packEntity,
} from "@/ecs/Entity"
import { EntityRegistry } from "@/ecs/EntityRegistry"

describe("Entity", () => {
	test("packs and unpacks index and generation", () => {
		const entity = packEntity(12345, 4095)
		expect(entityIndex(entity)).toBe(12345)
		expect(entityGeneration(entity)).toBe(4095)
		expect(entity).toBeGreaterThanOrEqual(0)
	})
})

describe("EntityRegistry", () => {
	test("issues unique live entities", () => {
		const registry = new EntityRegistry()
		const issued = new Set(
			Array.from({ length: 1000 }, () => registry.create()),
		)
		expect(issued.size).toBe(1000)
		expect(registry.aliveCount).toBe(1000)
	})

	test("reuses a destroyed index with a bumped generation", () => {
		const registry = new EntityRegistry()
		const first = registry.create()
		registry.destroy(first)
		const second = registry.create()
		expect(entityIndex(second)).toBe(entityIndex(first))
		expect(entityGeneration(second)).toBe(entityGeneration(first) + 1)
		expect(registry.isAlive(first)).toBe(false)
		expect(registry.isAlive(second)).toBe(true)
	})

	test("destroying twice returns false", () => {
		const registry = new EntityRegistry()
		const entity = registry.create()
		expect(registry.destroy(entity)).toBe(true)
		expect(registry.destroy(entity)).toBe(false)
		expect(registry.aliveCount).toBe(0)
	})

	test("generation wraps after 4096 reuses and stays valid", () => {
		const registry = new EntityRegistry()
		const first = registry.create()
		let latest = first
		for (let reuse = 0; reuse <= ENTITY_GENERATION_MASK; reuse++) {
			registry.destroy(latest)
			latest = registry.create()
		}
		expect(entityIndex(latest)).toBe(entityIndex(first))
		expect(entityGeneration(latest)).toBe(entityGeneration(first))
		expect(registry.isAlive(latest)).toBe(true)
	})

	test("capacity tracks the highest index issued", () => {
		const registry = new EntityRegistry()
		registry.create()
		registry.create()
		expect(registry.capacity).toBe(2)
	})
})
