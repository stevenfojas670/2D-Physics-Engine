type Entity = number

const ENTITY_INDEX_BITS = 20
const ENTITY_GENERATION_BITS = 12
const ENTITY_INDEX_MASK = 0xfffff
const ENTITY_GENERATION_MASK = 0xfff
const MAX_ENTITIES = 1 << ENTITY_INDEX_BITS
const GENERATION_SHIFT_FACTOR = 2 ** ENTITY_INDEX_BITS

function packEntity(index: number, generation: number): Entity {
	return (
		((generation & ENTITY_GENERATION_MASK) * GENERATION_SHIFT_FACTOR +
			(index & ENTITY_INDEX_MASK)) >>>
		0
	)
}

function entityIndex(entity: Entity): number {
	return entity & ENTITY_INDEX_MASK
}

function entityGeneration(entity: Entity): number {
	return (entity >>> ENTITY_INDEX_BITS) & ENTITY_GENERATION_MASK
}

export type { Entity }
export {
	ENTITY_INDEX_BITS,
	ENTITY_GENERATION_BITS,
	ENTITY_INDEX_MASK,
	ENTITY_GENERATION_MASK,
	MAX_ENTITIES,
	packEntity,
	entityIndex,
	entityGeneration,
}
