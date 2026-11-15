import type { Entity } from "@/ecs/Entity"
import type { System } from "@/ecs/Schedule"
import type { World } from "@/ecs/World"
import { Asleep } from "@/components/Asleep"
import { NeverSleep } from "@/components/NeverSleep"
import { Particle } from "@/components/Particle"
import { SleepTimer } from "@/components/SleepTimer"
import { Velocity } from "@/components/Velocity"
import { Islands, IslandsResource } from "@/resources/Islands"
import type { SleepSettings } from "@/resources/SleepSettings"
import { SleepSettingsResource } from "@/resources/SleepSettings"
import { fallAsleep, installSleepResources } from "@/sleeping/wakeBodies"

const MISSING_SLOT = -1

function createSleepSystem(world: World): System {
	installSleepResources(world)
	if (!world.hasResource(IslandsResource)) {
		world.setResource(IslandsResource, new Islands())
	}
	const timerStore = world.store(SleepTimer)
	const timers = timerStore.columns
	const velocities = world.store(Velocity).columns
	const neverSleep = world.store(NeverSleep)
	const sleepers = world.view([SleepTimer, Velocity], {
		without: [NeverSleep, Asleep, Particle],
	})
	let settings: SleepSettings
	let stepDeltaTime = 0

	const updateTimer = (timerSlot: number, velocitySlot: number): void => {
		const velocityX = velocities.x[velocitySlot]
		const velocityY = velocities.y[velocitySlot]
		const linearThreshold = settings.linearThreshold
		const isStill =
			velocityX * velocityX + velocityY * velocityY <
				linearThreshold * linearThreshold &&
			Math.abs(velocities.angular[velocitySlot]) < settings.angularThreshold
		timers.sleepTime[timerSlot] = isStill
			? timers.sleepTime[timerSlot] + stepDeltaTime
			: 0
	}

	const isReady = (entity: Entity): boolean => {
		const slot = timerStore.slotOf(entity)
		return (
			slot !== MISSING_SLOT &&
			!neverSleep.has(entity) &&
			timers.sleepTime[slot] >= settings.timeout
		)
	}

	return (deltaTime) => {
		settings = world.resource(SleepSettingsResource)
		if (!settings.enabled) {
			return
		}
		stepDeltaTime = deltaTime
		sleepers.each(updateTimer)
		const islands = world.resource(IslandsResource)
		for (let island = 0; island < islands.count; island++) {
			const members = islands.members(island)
			if (members.every(isReady)) {
				fallAsleep(world, members)
			}
		}
	}
}

export { createSleepSystem }
