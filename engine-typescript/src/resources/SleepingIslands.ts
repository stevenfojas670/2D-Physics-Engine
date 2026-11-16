import { defineResource } from "@/ecs/defineResource"
import type { Entity } from "@/ecs/Entity"

class SleepingIslands {
	private readonly islandByEntity = new Map<Entity, number>()
	private readonly membersByIsland = new Map<number, Entity[]>()
	private nextIsland = 0

	get count(): number {
		return this.membersByIsland.size
	}

	record(members: readonly Entity[]): void {
		const island = this.nextIsland++
		const stored = [...members]
		for (const member of stored) {
			this.release(member)
			this.islandByEntity.set(member, island)
		}
		this.membersByIsland.set(island, stored)
	}

	take(entity: Entity): readonly Entity[] {
		const island = this.islandByEntity.get(entity)
		if (island === undefined) {
			return [entity]
		}
		const members = this.membersByIsland.get(island) ?? [entity]
		this.membersByIsland.delete(island)
		for (const member of members) {
			this.islandByEntity.delete(member)
		}
		return members
	}

	clear(): void {
		this.islandByEntity.clear()
		this.membersByIsland.clear()
	}

	private release(entity: Entity): void {
		const island = this.islandByEntity.get(entity)
		if (island === undefined) {
			return
		}
		const members = this.membersByIsland.get(island) ?? []
		const remaining = members.filter((member) => member !== entity)
		if (remaining.length === 0) {
			this.membersByIsland.delete(island)
		} else {
			this.membersByIsland.set(island, remaining)
		}
		this.islandByEntity.delete(entity)
	}
}

const SleepingIslandsResource =
	defineResource<SleepingIslands>("SleepingIslands")

export { SleepingIslands, SleepingIslandsResource }
