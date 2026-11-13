import type { ComponentStore } from "./ComponentStore"
import type { ComponentDefinition, Schema } from "./defineComponent"
import type { Entity } from "./Entity"

const MAX_VIEW_COMPONENTS = 6
const MISSING_SLOT = -1

type StoresOf<S extends readonly Schema[]> = {
	readonly [K in keyof S]: ComponentStore<S[K]>
}

type Slots<S extends readonly Schema[]> = { [K in keyof S]: number }

type ViewCallback<S extends readonly Schema[], R> = (
	entity: Entity,
	...slots: Slots<S>
) => R

type SixSlotCallback<R> = (
	entity: Entity,
	slot0: number,
	slot1: number,
	slot2: number,
	slot3: number,
	slot4: number,
	slot5: number,
) => R

class View<const S extends readonly Schema[]> {
	private readonly included: readonly ComponentStore<Schema>[]
	private readonly excluded: readonly ComponentStore<Schema>[]
	private readonly slots: Int32Array

	constructor(
		included: StoresOf<S>,
		excluded: readonly ComponentStore<Schema>[],
	) {
		if (included.length < 1 || included.length > MAX_VIEW_COMPONENTS) {
			throw new RangeError(
				`A view needs 1 to ${MAX_VIEW_COMPONENTS} components, got ${included.length}`,
			)
		}
		this.included = included as unknown as readonly ComponentStore<Schema>[]
		this.excluded = excluded
		this.slots = new Int32Array(MAX_VIEW_COMPONENTS).fill(MISSING_SLOT)
	}

	each(callback: ViewCallback<S, void>): void {
		const call = callback as unknown as SixSlotCallback<void>
		const driverIndex = this.smallestStoreIndex()
		const driver = this.included[driverIndex]
		const slots = this.slots
		for (let slot = driver.size - 1; slot >= 0; slot--) {
			if (slot >= driver.size) {
				continue
			}
			const entity = driver.entityAt(slot)
			if (this.gatherSlots(entity, driverIndex, slot)) {
				call(entity, slots[0], slots[1], slots[2], slots[3], slots[4], slots[5])
			}
		}
	}

	find(predicate: ViewCallback<S, boolean>): Entity | undefined {
		const call = predicate as unknown as SixSlotCallback<boolean>
		const driverIndex = this.smallestStoreIndex()
		const driver = this.included[driverIndex]
		const slots = this.slots
		for (let slot = driver.size - 1; slot >= 0; slot--) {
			const entity = driver.entityAt(slot)
			if (
				this.gatherSlots(entity, driverIndex, slot) &&
				call(entity, slots[0], slots[1], slots[2], slots[3], slots[4], slots[5])
			) {
				return entity
			}
		}
		return undefined
	}

	contains(entity: Entity): boolean {
		for (const store of this.included) {
			if (!store.has(entity)) {
				return false
			}
		}
		return !this.isExcluded(entity)
	}

	slot(entity: Entity, component: ComponentDefinition<Schema>): number {
		for (const store of this.included) {
			if (store.definition.id === component.id) {
				return store.slotOf(entity)
			}
		}
		throw new Error(`Component ${component.name} is not part of this view`)
	}

	size(): number {
		return this.included[this.smallestStoreIndex()].size
	}

	private smallestStoreIndex(): number {
		let smallestIndex = 0
		for (let index = 1; index < this.included.length; index++) {
			if (this.included[index].size < this.included[smallestIndex].size) {
				smallestIndex = index
			}
		}
		return smallestIndex
	}

	private gatherSlots(
		entity: Entity,
		driverIndex: number,
		driverSlot: number,
	): boolean {
		for (let index = 0; index < this.included.length; index++) {
			const slot =
				index === driverIndex ? driverSlot : this.included[index].slotOf(entity)
			if (slot === MISSING_SLOT) {
				return false
			}
			this.slots[index] = slot
		}
		return !this.isExcluded(entity)
	}

	private isExcluded(entity: Entity): boolean {
		for (const store of this.excluded) {
			if (store.has(entity)) {
				return true
			}
		}
		return false
	}
}

export type { Slots, StoresOf, ViewCallback }
export { View }
