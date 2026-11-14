import type { System } from "@/ecs/Schedule"
import type { World } from "@/ecs/World"
import { ForceAccumulator } from "@/components/ForceAccumulator"
import { WindExposure } from "@/components/WindExposure"
import { WindResource } from "@/resources/Wind"

function createWindSystem(world: World): System {
	const forces = world.store(ForceAccumulator).columns
	const exposures = world.store(WindExposure).columns
	const exposedBodies = world.view([ForceAccumulator, WindExposure])
	let windX = 0
	let windY = 0

	const applyWind = (forceSlot: number, exposureSlot: number): void => {
		const exposure = exposures.exposure[exposureSlot]
		forces.x[forceSlot] += windX * exposure
		forces.y[forceSlot] += windY * exposure
	}

	return () => {
		const wind = world.resource(WindResource)
		windX = wind.x
		windY = wind.y
		exposedBodies.each(applyWind)
	}
}

export { createWindSystem }
