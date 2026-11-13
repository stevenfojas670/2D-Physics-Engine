import { describe, expect, test } from "vitest"
import { ComponentStore } from "@/ecs/ComponentStore"
import { defineComponent } from "@/ecs/defineComponent"
import { packEntity } from "@/ecs/Entity"
import type { Entity } from "@/ecs/Entity"
import { View } from "@/ecs/View"

const A = defineComponent("A", { a: "f64" })
const B = defineComponent("B", { b: "f64" })
const Hidden = defineComponent("Hidden", {})

function entity(index: number): Entity {
	return packEntity(index, 0)
}

function visited(view: View<readonly [{ a: "f64" }, { b: "f64" }]>) {
	const seen: Entity[] = []
	view.each((current) => {
		seen.push(current)
	})
	return seen.sort((left, right) => left - right)
}

describe("View", () => {
	test("each visits only entities with all included components", () => {
		const storeA = new ComponentStore(A)
		const storeB = new ComponentStore(B)
		storeA.add(entity(0))
		storeA.add(entity(1))
		storeB.add(entity(1))
		storeB.add(entity(2))
		expect(visited(new View([storeA, storeB], []))).toEqual([entity(1)])
	})

	test("without excludes entities that have an excluded component", () => {
		const storeA = new ComponentStore(A)
		const storeB = new ComponentStore(B)
		const hidden = new ComponentStore(Hidden)
		for (const index of [0, 1, 2]) {
			storeA.add(entity(index))
			storeB.add(entity(index))
		}
		hidden.add(entity(1))
		expect(visited(new View([storeA, storeB], [hidden]))).toEqual([
			entity(0),
			entity(2),
		])
	})

	test("passes slots in the listed component order", () => {
		const storeA = new ComponentStore(A)
		const storeB = new ComponentStore(B)
		storeA.add(entity(9))
		storeA.add(entity(4), { a: 7 })
		storeB.add(entity(4), { b: 9 })
		const values: number[] = []
		new View([storeB, storeA], []).each((current, bSlot, aSlot) => {
			expect(current).toBe(entity(4))
			values.push(storeB.columns.b[bSlot], storeA.columns.a[aSlot])
		})
		expect(values).toEqual([9, 7])
	})

	test("gives the same result whichever store is smallest", () => {
		const storeA = new ComponentStore(A)
		const storeB = new ComponentStore(B)
		for (let index = 0; index < 10; index++) {
			storeA.add(entity(index))
		}
		storeB.add(entity(3))
		storeB.add(entity(7))
		const fromSmallB = visited(new View([storeA, storeB], []))
		for (let index = 10; index < 30; index++) {
			storeB.add(entity(index))
		}
		const fromSmallA = visited(new View([storeA, storeB], []))
		expect(fromSmallB).toEqual([entity(3), entity(7)])
		expect(fromSmallA).toEqual([entity(3), entity(7)])
	})

	test("destroying the current entity during each is safe", () => {
		const storeA = new ComponentStore(A)
		const storeB = new ComponentStore(B)
		for (let index = 0; index < 10; index++) {
			storeA.add(entity(index))
			storeB.add(entity(index))
		}
		let visits = 0
		new View([storeA, storeB], []).each((current) => {
			visits++
			storeA.remove(current)
			storeB.remove(current)
		})
		expect(visits).toBe(10)
		expect(storeA.size).toBe(0)
		expect(storeB.size).toBe(0)
	})

	test("sees entities added between calls", () => {
		const storeA = new ComponentStore(A)
		const storeB = new ComponentStore(B)
		const view = new View([storeA, storeB], [])
		expect(visited(view)).toEqual([])
		storeA.add(entity(2))
		storeB.add(entity(2))
		expect(visited(view)).toEqual([entity(2)])
	})

	test("view sees components first added after the view was built", () => {
		const storeA = new ComponentStore(A)
		const storeB = new ComponentStore(B)
		const view = new View([storeA, storeB], [])
		let visits = 0
		view.each(() => visits++)
		expect(visits).toBe(0)
		storeA.add(entity(5), { a: 1 })
		storeB.add(entity(5), { b: 2 })
		view.each(() => visits++)
		expect(visits).toBe(1)
	})

	test("find stops at the first match", () => {
		const storeA = new ComponentStore(A)
		for (let index = 0; index < 10; index++) {
			storeA.add(entity(index), { a: index })
		}
		let calls = 0
		const found = new View([storeA], []).find((current, aSlot) => {
			calls++
			return current >= 0 && storeA.columns.a[aSlot] === 6
		})
		expect(found).toBe(entity(6))
		expect(calls).toBeLessThan(10)
	})

	test("find returns undefined when nothing matches", () => {
		const storeA = new ComponentStore(A)
		storeA.add(entity(0))
		expect(new View([storeA], []).find(() => false)).toBeUndefined()
	})

	test("contains, slot and size answer one-off questions", () => {
		const storeA = new ComponentStore(A)
		const storeB = new ComponentStore(B)
		storeA.add(entity(0))
		storeA.add(entity(1))
		storeB.add(entity(1))
		const view = new View([storeA, storeB], [])
		expect(view.contains(entity(1))).toBe(true)
		expect(view.contains(entity(0))).toBe(false)
		expect(view.slot(entity(1), B)).toBe(storeB.slotOf(entity(1)))
		expect(view.size()).toBe(1)
	})

	test("throws for more than six components", () => {
		const stores = [0, 1, 2, 3, 4, 5, 6].map(
			(index) => new ComponentStore(defineComponent(`C${index}`, {})),
		)
		expect(() => new View(stores, [])).toThrow(RangeError)
	})
})
