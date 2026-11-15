import type { Entity } from "@/ecs/Entity"
import type { System } from "@/ecs/Schedule"
import type { World } from "@/ecs/World"
import { Asleep } from "@/components/Asleep"
import { NeverSleep } from "@/components/NeverSleep"
import { Particle } from "@/components/Particle"
import { SleepTimer } from "@/components/SleepTimer"
import { Velocity } from "@/components/Velocity"
import type { SleepSettings } from "@/resources/SleepSettings"
import { SleepSettingsResource } from "@/resources/SleepSettings"
import { fallAsleep, installSleepResources } from "@/sleeping/wakeBodies"

function createSleepSystem(world: World): System {
	installSleepResources(world)
	const timers = world.store(SleepTimer).columns
	const velocities = world.store(Velocity).columns
	const sleepers = world.view([SleepTimer, Velocity], {
		without: [NeverSleep, Asleep, Particle],
	})
	let settings: SleepSettings
	let stepDeltaTime = 0

	const updateTimer = (
		timerSlot: number,
		velocitySlot: number,
		entity: Entity,
	): void => {
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
		if (timers.sleepTime[timerSlot] >= settings.timeout) {
			fallAsleep(world, [entity])
		}
	}

	return (deltaTime) => {
		settings = world.resource(SleepSettingsResource)
		if (!settings.enabled) {
			return
		}
		stepDeltaTime = deltaTime
		sleepers.each(updateTimer)
	}
}

export { createSleepSystem }
