import {
	ENTITY_GENERATION_MASK,
	MAX_ENTITIES,
	entityGeneration,
	entityIndex,
	packEntity,
} from "./Entity"
import type { Entity } from "./Entity"

const INITIAL_GENERATION_CAPACITY = 64

class EntityRegistry {
	private generations: Uint16Array
	private alive: Uint8Array
	private freeIndices: number[]
	private nextIndex: number
	private liveCount: number

	constructor() {
		this.generations = new Uint16Array(INITIAL_GENERATION_CAPACITY)
		this.alive = new Uint8Array(INITIAL_GENERATION_CAPACITY)
		this.freeIndices = []
		this.nextIndex = 0
		this.liveCount = 0
	}

	get aliveCount(): number {
		return this.liveCount
	}

	get capacity(): number {
		return this.nextIndex
	}

	create(): Entity {
		const reusedIndex = this.freeIndices.pop()
		const index = reusedIndex ?? this.claimNewIndex()
		this.alive[index] = 1
		this.liveCount++
		return packEntity(index, this.generations[index])
	}

	destroy(entity: Entity): boolean {
		if (!this.isAlive(entity)) {
			return false
		}
		const index = entityIndex(entity)
		this.alive[index] = 0
		this.generations[index] =
			(this.generations[index] + 1) & ENTITY_GENERATION_MASK
		this.freeIndices.push(index)
		this.liveCount--
		return true
	}

	isAlive(entity: Entity): boolean {
		const index = entityIndex(entity)
		return (
			index < this.nextIndex &&
			this.alive[index] === 1 &&
			this.generations[index] === entityGeneration(entity)
		)
	}

	private claimNewIndex(): number {
		if (this.nextIndex >= MAX_ENTITIES) {
			throw new RangeError(`Cannot create more than ${MAX_ENTITIES} entities`)
		}
		const index = this.nextIndex
		this.nextIndex++
		if (index >= this.generations.length) {
			this.grow()
		}
		return index
	}

	private grow(): void {
		const grownLength = this.generations.length * 2
		const grownGenerations = new Uint16Array(grownLength)
		grownGenerations.set(this.generations)
		this.generations = grownGenerations
		const grownAlive = new Uint8Array(grownLength)
		grownAlive.set(this.alive)
		this.alive = grownAlive
	}
}

export { EntityRegistry }
