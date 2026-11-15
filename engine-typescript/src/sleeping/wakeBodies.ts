import type { Entity } from "@/ecs/Entity"
import type { World } from "@/ecs/World"
import { Asleep } from "@/components/Asleep"
import { Collider } from "@/components/Collider"
import { ForceAccumulator } from "@/components/ForceAccumulator"
import { SleepTimer } from "@/components/SleepTimer"
import { Velocity } from "@/components/Velocity"
import {
	createSleepSettings,
	SleepSettingsResource,
} from "@/resources/SleepSettings"
import {
	SleepingIslands,
	SleepingIslandsResource,
} from "@/resources/SleepingIslands"

const WAKE_MARGIN = 1
const MISSING_SLOT = -1

function installSleepResources(world: World): void {
	if (!world.hasResource(SleepSettingsResource)) {
		world.setResource(SleepSettingsResource, createSleepSettings())
	}
	if (!world.hasResource(SleepingIslandsResource)) {
		world.setResource(SleepingIslandsResource, new SleepingIslands())
	}
}

function resetSleepTime(world: World, entity: Entity): void {
	const timers = world.store(SleepTimer)
	const slot = timers.slotOf(entity)
	if (slot !== MISSING_SLOT) {
		timers.columns.sleepTime[slot] = 0
	}
}

function wakeMembers(world: World, members: readonly Entity[]): void {
	for (const member of members) {
		if (!world.isAlive(member)) {
			continue
		}
		world.remove(member, Asleep)
		resetSleepTime(world, member)
	}
}

function wakeBody(world: World, entity: Entity): void {
	if (!world.isAlive(entity)) {
		return
	}
	resetSleepTime(world, entity)
	if (!world.has(entity, Asleep)) {
		return
	}
	world.defer((deferredWorld) => {
		installSleepResources(deferredWorld)
		const islands = deferredWorld.resource(SleepingIslandsResource)
		wakeMembers(deferredWorld, islands.take(entity))
	})
}

function wakeAllBodies(world: World): void {
	world.defer((deferredWorld) => {
		installSleepResources(deferredWorld)
		const asleep = deferredWorld.store(Asleep)
		const sleepers: Entity[] = []
		for (let slot = 0; slot < asleep.size; slot++) {
			sleepers.push(asleep.entityAt(slot))
		}
		wakeMembers(deferredWorld, sleepers)
		deferredWorld.resource(SleepingIslandsResource).clear()
	})
}

function wakeBodiesOverlapping(
	world: World,
	minX: number,
	minY: number,
	maxX: number,
	maxY: number,
): void {
	const colliders = world.store(Collider).columns
	world.view([Asleep, Collider]).each((asleepSlot, colliderSlot, entity) => {
		void asleepSlot
		const overlaps =
			colliders.minX[colliderSlot] <= maxX + WAKE_MARGIN &&
			colliders.maxX[colliderSlot] >= minX - WAKE_MARGIN &&
			colliders.minY[colliderSlot] <= maxY + WAKE_MARGIN &&
			colliders.maxY[colliderSlot] >= minY - WAKE_MARGIN
		if (overlaps) {
			wakeBody(world, entity)
		}
	})
}

function zeroMotion(world: World, entity: Entity): void {
	const velocities = world.store(Velocity)
	const velocitySlot = velocities.slotOf(entity)
	if (velocitySlot !== MISSING_SLOT) {
		velocities.columns.x[velocitySlot] = 0
		velocities.columns.y[velocitySlot] = 0
		velocities.columns.angular[velocitySlot] = 0
	}
	const forces = world.store(ForceAccumulator)
	const forceSlot = forces.slotOf(entity)
	if (forceSlot !== MISSING_SLOT) {
		forces.columns.x[forceSlot] = 0
		forces.columns.y[forceSlot] = 0
		forces.columns.torque[forceSlot] = 0
	}
}

function fallAsleep(world: World, members: readonly Entity[]): void {
	const group = [...members]
	world.defer((deferredWorld) => {
		installSleepResources(deferredWorld)
		const alive = group.filter((member) => deferredWorld.isAlive(member))
		for (const member of alive) {
			zeroMotion(deferredWorld, member)
			deferredWorld.add(member, Asleep)
		}
		if (alive.length > 0) {
			deferredWorld.resource(SleepingIslandsResource).record(alive)
		}
	})
}

export {
	fallAsleep,
	installSleepResources,
	wakeAllBodies,
	wakeBodiesOverlapping,
	wakeBody,
}
