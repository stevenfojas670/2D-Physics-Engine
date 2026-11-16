import { defineResource } from "@/ecs/defineResource"
import {
	CollisionGroups,
	DEFAULT_COLLISION,
} from "@/optimizations/CollisionGroups"
import type { CollisionGroup } from "@/types/collisionGroups/collisionGroups.types"

class CollisionSettings {
	private readonly matrix: Map<number, number>
	private readonly names: Map<number, string>
	private changes: number

	constructor() {
		this.matrix = new Map()
		this.names = new Map()
		this.changes = 0
		for (const group of Object.values(CollisionGroups)) {
			this.matrix.set(group.id, DEFAULT_COLLISION)
			this.names.set(group.id, group.name)
		}
	}

	get version(): number {
		return this.changes
	}

	canCollide(groupA: number, groupB: number): boolean {
		return ((this.matrix.get(groupA) ?? 0) & groupB) !== 0
	}

	enableCollision(groupA: CollisionGroup, groupB: CollisionGroup): void {
		this.matrix.set(groupA.id, (this.matrix.get(groupA.id) ?? 0) | groupB.id)
		this.matrix.set(groupB.id, (this.matrix.get(groupB.id) ?? 0) | groupA.id)
		this.changes++
	}

	disableCollision(groupA: CollisionGroup, groupB: CollisionGroup): void {
		this.matrix.set(groupA.id, (this.matrix.get(groupA.id) ?? 0) & ~groupB.id)
		this.matrix.set(groupB.id, (this.matrix.get(groupB.id) ?? 0) & ~groupA.id)
		this.changes++
	}

	setGroupName(group: CollisionGroup, name: string): void {
		this.names.set(group.id, name)
	}

	groupName(group: CollisionGroup): string {
		return this.names.get(group.id) ?? group.name
	}
}

const CollisionSettingsResource =
	defineResource<CollisionSettings>("CollisionSettings")

export { CollisionSettings, CollisionSettingsResource }
