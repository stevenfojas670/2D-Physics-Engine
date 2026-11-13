import { entityIndex } from "./Entity"
import type { Entity } from "./Entity"
import { isRefField } from "./defineComponent"
import type {
	Columns,
	ComponentDefinition,
	FieldValues,
	NumericFieldType,
	Schema,
} from "./defineComponent"

type NumericColumn =
	Float64Array | Float32Array | Int32Array | Uint32Array | Uint8Array

const EMPTY_SLOT = -1
const DEFAULT_CAPACITY = 64

function createNumericColumn(
	type: NumericFieldType,
	length: number,
): NumericColumn {
	switch (type) {
		case "f64":
			return new Float64Array(length)
		case "f32":
			return new Float32Array(length)
		case "i32":
			return new Int32Array(length)
		case "u32":
			return new Uint32Array(length)
		case "u8":
			return new Uint8Array(length)
	}
}

class ComponentStore<S extends Schema> {
	readonly definition: ComponentDefinition<S>
	readonly columns: Columns<S>
	private sparse: Int32Array
	private dense: Uint32Array
	private count: number
	private numericFields: { name: string; type: NumericFieldType }[]
	private refFields: string[]

	constructor(
		definition: ComponentDefinition<S>,
		initialCapacity: number = DEFAULT_CAPACITY,
	) {
		const capacity = Math.max(1, initialCapacity)
		this.definition = definition
		this.sparse = new Int32Array(capacity).fill(EMPTY_SLOT)
		this.dense = new Uint32Array(capacity)
		this.count = 0
		this.numericFields = []
		this.refFields = []

		const columns: Record<string, NumericColumn | unknown[]> = {}
		for (const [name, field] of Object.entries(definition.schema)) {
			if (isRefField(field)) {
				this.refFields.push(name)
				columns[name] = new Array<unknown>(capacity).fill(undefined)
			} else {
				this.numericFields.push({ name, type: field })
				columns[name] = createNumericColumn(field, capacity)
			}
		}
		this.columns = columns as Columns<S>
	}

	get size(): number {
		return this.count
	}

	entityAt(slot: number): Entity {
		return this.dense[slot]
	}

	has(entity: Entity): boolean {
		return this.slotOf(entity) !== EMPTY_SLOT
	}

	slotOf(entity: Entity): number {
		const index = entityIndex(entity)
		if (index >= this.sparse.length) {
			return EMPTY_SLOT
		}
		const slot = this.sparse[index]
		if (slot === EMPTY_SLOT || this.dense[slot] !== entity) {
			return EMPTY_SLOT
		}
		return slot
	}

	add(entity: Entity, values?: Partial<FieldValues<S>>): number {
		const existingSlot = this.slotOf(entity)
		const slot =
			existingSlot === EMPTY_SLOT ? this.appendSlot(entity) : existingSlot
		if (values !== undefined) {
			this.writeValues(slot, values)
		}
		return slot
	}

	remove(entity: Entity): boolean {
		const slot = this.slotOf(entity)
		if (slot === EMPTY_SLOT) {
			return false
		}
		const lastSlot = this.count - 1
		const columns = this.columns as Record<string, NumericColumn | unknown[]>
		if (slot !== lastSlot) {
			const movedEntity = this.dense[lastSlot]
			this.dense[slot] = movedEntity
			this.sparse[entityIndex(movedEntity)] = slot
			for (const field of this.numericFields) {
				const column = columns[field.name] as NumericColumn
				column[slot] = column[lastSlot]
			}
			for (const name of this.refFields) {
				const column = columns[name] as unknown[]
				column[slot] = column[lastSlot]
			}
		}
		for (const field of this.numericFields) {
			const column = columns[field.name] as NumericColumn
			column[lastSlot] = 0
		}
		for (const name of this.refFields) {
			const column = columns[name] as unknown[]
			column[lastSlot] = undefined
		}
		this.sparse[entityIndex(entity)] = EMPTY_SLOT
		this.count--
		return true
	}

	clear(): void {
		while (this.count > 0) {
			this.remove(this.dense[this.count - 1])
		}
	}

	private appendSlot(entity: Entity): number {
		const index = entityIndex(entity)
		if (index >= this.sparse.length) {
			this.growSparse(index + 1)
		}
		if (this.count >= this.dense.length) {
			this.growDense()
		}
		const slot = this.count
		this.dense[slot] = entity
		this.sparse[index] = slot
		this.count++
		return slot
	}

	private writeValues(slot: number, values: Partial<FieldValues<S>>): void {
		const columns = this.columns as Record<string, NumericColumn | unknown[]>
		for (const [name, value] of Object.entries(values)) {
			const column = columns[name]
			if (column !== undefined) {
				column[slot] = value as never
			}
		}
	}

	private growSparse(minimumLength: number): void {
		let length = this.sparse.length
		while (length < minimumLength) {
			length *= 2
		}
		const grown = new Int32Array(length).fill(EMPTY_SLOT)
		grown.set(this.sparse)
		this.sparse = grown
	}

	private growDense(): void {
		const length = this.dense.length * 2
		const grownDense = new Uint32Array(length)
		grownDense.set(this.dense)
		this.dense = grownDense

		const columns = this.columns as Record<string, NumericColumn | unknown[]>
		for (const field of this.numericFields) {
			const grown = createNumericColumn(field.type, length)
			grown.set(columns[field.name] as NumericColumn)
			columns[field.name] = grown
		}
		for (const name of this.refFields) {
			const column = columns[name] as unknown[]
			while (column.length < length) {
				column.push(undefined)
			}
		}
	}
}

export { ComponentStore }
