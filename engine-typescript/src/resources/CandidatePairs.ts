import { defineResource } from "@/ecs/defineResource"
import type { Entity } from "@/ecs/Entity"

const INITIAL_PAIR_CAPACITY = 256

class CandidatePairs {
	private entities: Uint32Array
	private pairCount: number

	constructor() {
		this.entities = new Uint32Array(INITIAL_PAIR_CAPACITY * 2)
		this.pairCount = 0
	}

	get count(): number {
		return this.pairCount
	}

	entityA(pair: number): Entity {
		return this.entities[pair * 2]
	}

	entityB(pair: number): Entity {
		return this.entities[pair * 2 + 1]
	}

	clear(): void {
		this.pairCount = 0
	}

	push(entityA: Entity, entityB: Entity): void {
		const offset = this.pairCount * 2
		if (offset + 2 > this.entities.length) {
			const grown = new Uint32Array(this.entities.length * 2)
			grown.set(this.entities)
			this.entities = grown
		}
		this.entities[offset] = entityA
		this.entities[offset + 1] = entityB
		this.pairCount++
	}
}

const CandidatePairsResource = defineResource<CandidatePairs>("CandidatePairs")

export { CandidatePairs, CandidatePairsResource }
