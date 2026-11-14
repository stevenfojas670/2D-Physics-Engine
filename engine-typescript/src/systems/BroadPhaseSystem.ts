import type { Entity } from "@/ecs/Entity"
import { entityIndex } from "@/ecs/Entity"
import type { System } from "@/ecs/Schedule"
import type { World } from "@/ecs/World"
import { Collider } from "@/components/Collider"
import { CollisionGroup } from "@/components/CollisionGroup"
import { Particle } from "@/components/Particle"
import type { BroadPhaseGrid } from "@/optimizations/broadPhase/BroadPhaseGrid"
import { BroadPhaseResource } from "@/resources/BroadPhase"
import {
	CandidatePairs,
	CandidatePairsResource,
} from "@/resources/CandidatePairs"
import type { CollisionSettings } from "@/resources/CollisionSettings"
import { CollisionSettingsResource } from "@/resources/CollisionSettings"

const MAX_STAMP = 0xffffffff

function createBroadPhaseSystem(world: World): System {
	const colliders = world.store(Collider).columns
	const groups = world.store(CollisionGroup)
	const collidable = world.view([Collider, CollisionGroup], {
		without: [Particle],
	})
	const pairs = new CandidatePairs()
	world.setResource(CandidatePairsResource, pairs)
	let lastSeenStamp = new Uint32Array(0)
	let currentStamp = 0
	let grid: BroadPhaseGrid
	let settings: CollisionSettings

	const growStamps = (capacity: number): void => {
		if (capacity <= lastSeenStamp.length) {
			return
		}
		const grown = new Uint32Array(Math.max(capacity, lastSeenStamp.length * 2))
		grown.set(lastSeenStamp)
		lastSeenStamp = grown
	}

	const nextStamp = (): number => {
		if (currentStamp === MAX_STAMP) {
			lastSeenStamp.fill(0)
			currentStamp = 0
		}
		currentStamp++
		return currentStamp
	}

	const insertCollider = (
		colliderSlot: number,
		groupSlot: number,
		entity: Entity,
	): void => {
		void groupSlot
		grid.insert(
			entity,
			colliders.minX[colliderSlot],
			colliders.minY[colliderSlot],
			colliders.maxX[colliderSlot],
			colliders.maxY[colliderSlot],
		)
	}

	const collectPairs = (
		colliderSlot: number,
		groupSlot: number,
		entityA: Entity,
	): void => {
		void colliderSlot
		const indexA = entityIndex(entityA)
		const groupA = groups.columns.group[groupSlot]
		const stamp = nextStamp()
		const cells = grid.cellsOf(entityA)
		for (let cellIndex = 0; cellIndex < cells.length; cellIndex++) {
			const neighbours = grid.entitiesInCell(cells[cellIndex])
			for (
				let neighbourIndex = 0;
				neighbourIndex < neighbours.length;
				neighbourIndex++
			) {
				const entityB = neighbours[neighbourIndex]
				const indexB = entityIndex(entityB)
				if (indexB <= indexA || lastSeenStamp[indexB] === stamp) {
					continue
				}
				lastSeenStamp[indexB] = stamp
				const groupSlotB = groups.slotOf(entityB)
				if (
					groupSlotB !== -1 &&
					settings.canCollide(groupA, groups.columns.group[groupSlotB])
				) {
					pairs.push(entityA, entityB)
				}
			}
		}
	}

	return () => {
		grid = world.resource(BroadPhaseResource)
		settings = world.resource(CollisionSettingsResource)
		growStamps(world.entityCapacity)
		grid.clear()
		pairs.clear()
		collidable.each(insertCollider)
		collidable.each(collectPairs)
	}
}

export { createBroadPhaseSystem }
