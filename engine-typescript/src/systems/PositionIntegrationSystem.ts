import type { System } from "@/ecs/Schedule"
import type { World } from "@/ecs/World"
import { Particle } from "@/components/Particle"
import { Sleep } from "@/components/Sleep"
import { Transform } from "@/components/Transform"
import { Velocity } from "@/components/Velocity"
import {
	PseudoVelocities,
	PseudoVelocitiesResource,
} from "@/resources/PseudoVelocities"

function createPositionIntegrationSystem(world: World): System {
	if (!world.hasResource(PseudoVelocitiesResource)) {
		world.setResource(PseudoVelocitiesResource, new PseudoVelocities())
	}
	const velocityStore = world.store(Velocity)
	const transforms = world.store(Transform).columns
	const velocities = velocityStore.columns
	const bodies = world.view([Transform, Velocity, Sleep], {
		without: [Particle],
	})
	let pseudo = world.resource(PseudoVelocitiesResource)
	let stepDeltaTime = 0

	const integrate = (transformSlot: number, velocitySlot: number): void => {
		const deltaTime = stepDeltaTime
		transforms.x[transformSlot] +=
			(velocities.x[velocitySlot] + pseudo.x[velocitySlot]) * deltaTime
		transforms.y[transformSlot] +=
			(velocities.y[velocitySlot] + pseudo.y[velocitySlot]) * deltaTime
		transforms.angle[transformSlot] +=
			(velocities.angular[velocitySlot] + pseudo.angular[velocitySlot]) *
			deltaTime
	}

	return (deltaTime) => {
		stepDeltaTime = deltaTime
		pseudo = world.resource(PseudoVelocitiesResource)
		pseudo.ensureCapacity(velocityStore.size)
		bodies.each(integrate)
		pseudo.clear()
	}
}

export { createPositionIntegrationSystem }
