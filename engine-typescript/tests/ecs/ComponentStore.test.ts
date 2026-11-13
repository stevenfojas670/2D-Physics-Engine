import { describe, expect, test } from "vitest"
import { ComponentStore } from "@/ecs/ComponentStore"
import { defineComponent, ref } from "@/ecs/defineComponent"
import { packEntity } from "@/ecs/Entity"

const Point = defineComponent("Point", {
	x: "f64",
	y: "f64",
	tag: "u8",
	label: ref<string>(),
})

describe("defineComponent", () => {
	test("gives each definition its own id", () => {
		const other = defineComponent("Other", {})
		expect(other.id).not.toBe(Point.id)
		expect(other.name).toBe("Other")
	})
})

describe("ComponentStore", () => {
	test("add stores values and slotOf finds them", () => {
		const store = new ComponentStore(Point)
		const entity = packEntity(3, 0)
		const slot = store.add(entity, { x: 1.5, y: -2, label: "a" })
		expect(store.slotOf(entity)).toBe(slot)
		expect(store.has(entity)).toBe(true)
		expect(store.columns.x[slot]).toBe(1.5)
		expect(store.columns.y[slot]).toBe(-2)
		expect(store.columns.label[slot]).toBe("a")
		expect(store.columns.tag[slot]).toBe(0)
		expect(store.entityAt(slot)).toBe(entity)
	})

	test("adding again overwrites values in the same slot", () => {
		const store = new ComponentStore(Point)
		const entity = packEntity(1, 0)
		const slot = store.add(entity, { x: 1 })
		expect(store.add(entity, { x: 2 })).toBe(slot)
		expect(store.columns.x[slot]).toBe(2)
		expect(store.size).toBe(1)
	})

	test("swap-remove keeps other entities' data", () => {
		const store = new ComponentStore(Point)
		const entities = [packEntity(0, 0), packEntity(1, 0), packEntity(2, 0)]
		entities.forEach((entity, index) => store.add(entity, { x: index }))
		expect(store.remove(entities[0])).toBe(true)
		expect(store.size).toBe(2)
		expect(store.has(entities[0])).toBe(false)
		expect(store.columns.x[store.slotOf(entities[1])]).toBe(1)
		expect(store.columns.x[store.slotOf(entities[2])]).toBe(2)
	})

	test("removing an absent entity returns false", () => {
		const store = new ComponentStore(Point)
		expect(store.remove(packEntity(9, 0))).toBe(false)
	})

	test("stale generation is not found", () => {
		const store = new ComponentStore(Point)
		store.add(packEntity(5, 0))
		expect(store.has(packEntity(5, 1))).toBe(false)
		expect(store.slotOf(packEntity(5, 1))).toBe(-1)
	})

	test("grows past initial capacity without losing data", () => {
		const store = new ComponentStore(Point, 2)
		for (let index = 0; index < 1000; index++) {
			store.add(packEntity(index, 0), { x: index, label: `e${index}` })
		}
		for (let index = 0; index < 1000; index++) {
			const slot = store.slotOf(packEntity(index, 0))
			expect(store.columns.x[slot]).toBe(index)
			expect(store.columns.label[slot]).toBe(`e${index}`)
		}
	})

	test("removing the last entity leaves an empty store", () => {
		const store = new ComponentStore(Point)
		const entity = packEntity(0, 0)
		store.add(entity)
		store.remove(entity)
		expect(store.size).toBe(0)
		expect(store.has(entity)).toBe(false)
	})

	test("ref slot is cleared after removal", () => {
		const store = new ComponentStore(Point)
		store.add(packEntity(0, 0), { label: "a" })
		store.add(packEntity(1, 0), { label: "b" })
		store.remove(packEntity(1, 0))
		expect(store.columns.label[1]).toBeUndefined()
	})

	test("re-adding a removed entity starts from default values", () => {
		const store = new ComponentStore(Point)
		store.add(packEntity(0, 0), { x: 1 })
		store.add(packEntity(1, 0), { x: 5, tag: 3 })
		store.remove(packEntity(1, 0))
		const slot = store.add(packEntity(2, 0))
		expect(store.columns.x[slot]).toBe(0)
		expect(store.columns.tag[slot]).toBe(0)
	})

	test("clear empties the store", () => {
		const store = new ComponentStore(Point)
		store.add(packEntity(0, 0))
		store.clear()
		expect(store.size).toBe(0)
		expect(store.has(packEntity(0, 0))).toBe(false)
	})
})
