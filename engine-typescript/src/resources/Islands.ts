import { defineResource } from "@/ecs/defineResource"
import type { Entity } from "@/ecs/Entity"
import { entityIndex } from "@/ecs/Entity"
import { UnionFind } from "@/sleeping/UnionFind"

const NOT_ADDED = -1

class Islands {
	private readonly sets = new UnionFind()
	private bodyAtIndex = new Float64Array(0)
	private islandAtIndex = new Int32Array(0)
	private addedIndices: number[] = []
	private islandStarts: number[] = []
	private sortedMembers: Entity[] = []
	private islandCount = 0

	get count(): number {
		return this.islandCount
	}

	begin(entityCapacity: number): void {
		if (entityCapacity > this.bodyAtIndex.length) {
			const capacity = Math.max(entityCapacity, this.bodyAtIndex.length * 2)
			this.bodyAtIndex = new Float64Array(capacity)
			this.islandAtIndex = new Int32Array(capacity)
		}
		this.bodyAtIndex.fill(NOT_ADDED)
		this.islandAtIndex.fill(NOT_ADDED)
		this.sets.reset(entityCapacity)
		this.addedIndices = []
		this.islandStarts = []
		this.sortedMembers = []
		this.islandCount = 0
	}

	addBody(entity: Entity): void {
		const index = entityIndex(entity)
		if (this.bodyAtIndex[index] === NOT_ADDED) {
			this.addedIndices.push(index)
		}
		this.bodyAtIndex[index] = entity
	}

	link(entityA: Entity, entityB: Entity): void {
		if (this.isAdded(entityA) && this.isAdded(entityB)) {
			this.sets.union(entityIndex(entityA), entityIndex(entityB))
		}
	}

	finish(): void {
		const islandOfRoot = new Map<number, number>()
		const sizes: number[] = []
		for (const index of this.addedIndices) {
			const root = this.sets.find(index)
			let island = islandOfRoot.get(root)
			if (island === undefined) {
				island = sizes.length
				islandOfRoot.set(root, island)
				sizes.push(0)
			}
			this.islandAtIndex[index] = island
			sizes[island]++
		}
		this.islandCount = sizes.length
		const next: number[] = []
		let start = 0
		for (const size of sizes) {
			this.islandStarts.push(start)
			next.push(start)
			start += size
		}
		this.islandStarts.push(start)
		this.sortedMembers = new Array<Entity>(start)
		for (const index of this.addedIndices) {
			const island = this.islandAtIndex[index]
			this.sortedMembers[next[island]++] = this.bodyAtIndex[index]
		}
	}

	members(island: number): readonly Entity[] {
		return this.sortedMembers.slice(
			this.islandStarts[island],
			this.islandStarts[island + 1],
		)
	}

	islandOf(entity: Entity): number {
		return this.isAdded(entity)
			? this.islandAtIndex[entityIndex(entity)]
			: NOT_ADDED
	}

	private isAdded(entity: Entity): boolean {
		const index = entityIndex(entity)
		return index < this.bodyAtIndex.length && this.bodyAtIndex[index] === entity
	}
}

const IslandsResource = defineResource<Islands>("Islands")

export { Islands, IslandsResource }
