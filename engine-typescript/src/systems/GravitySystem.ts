import type { System } from "@/ecs/Schedule"
import type { World } from "@/ecs/World"
import { ForceAccumulator } from "@/components/ForceAccumulator"
import { Mass } from "@/components/Mass"
import { GravityResource } from "@/resources/Gravity"

function createGravitySystem(world: World): System {
	const forces = world.store(ForceAccumulator).columns
	const masses = world.store(Mass).columns
	const bodies = world.view([ForceAccumulator, Mass])
	let gravityX = 0
	let gravityY = 0

	const applyGravity = (forceSlot: number, massSlot: number): void => {
		if (masses.inverseMass[massSlot] > 0) {
			forces.x[forceSlot] += gravityX * masses.mass[massSlot]
			forces.y[forceSlot] += gravityY * masses.mass[massSlot]
		}
	}

	return () => {
		const gravity = world.resource(GravityResource)
		gravityX = gravity.x
		gravityY = gravity.y
		bodies.each(applyGravity)
	}
}

export { createGravitySystem }
