import type { System } from "@/ecs/Schedule"
import type { World } from "@/ecs/World"
import type { CollisionSettings } from "@/resources/CollisionSettings"
import { CollisionSettingsResource } from "@/resources/CollisionSettings"
import { GravityResource } from "@/resources/Gravity"
import { SleepSettingsResource } from "@/resources/SleepSettings"
import { WindResource } from "@/resources/Wind"
import { installSleepResources, wakeAllBodies } from "@/sleeping/wakeBodies"

interface WorldState {
	gravityX: number
	gravityY: number
	windX: number
	windY: number
	collisionSettings: CollisionSettings | null
	collisionVersion: number
	sleepingEnabled: boolean
}

function readWorldState(world: World): WorldState {
	const gravity = world.hasResource(GravityResource)
		? world.resource(GravityResource)
		: { x: 0, y: 0 }
	const wind = world.hasResource(WindResource)
		? world.resource(WindResource)
		: { x: 0, y: 0 }
	const collisionSettings = world.hasResource(CollisionSettingsResource)
		? world.resource(CollisionSettingsResource)
		: null
	return {
		gravityX: gravity.x,
		gravityY: gravity.y,
		windX: wind.x,
		windY: wind.y,
		collisionSettings,
		collisionVersion: collisionSettings?.version ?? 0,
		sleepingEnabled: world.resource(SleepSettingsResource).enabled,
	}
}

function hasChanged(last: WorldState, now: WorldState): boolean {
	return (
		last.gravityX !== now.gravityX ||
		last.gravityY !== now.gravityY ||
		last.windX !== now.windX ||
		last.windY !== now.windY ||
		last.collisionSettings !== now.collisionSettings ||
		last.collisionVersion !== now.collisionVersion ||
		(last.sleepingEnabled && !now.sleepingEnabled)
	)
}

function createWorldChangeWakeSystem(world: World): System {
	installSleepResources(world)
	let last: WorldState | null = null

	return () => {
		const now = readWorldState(world)
		if (last !== null && hasChanged(last, now)) {
			wakeAllBodies(world)
		}
		last = now
	}
}

export { createWorldChangeWakeSystem }
