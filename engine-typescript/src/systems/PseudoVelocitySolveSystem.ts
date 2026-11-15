import type { System } from "@/ecs/Schedule"
import type { World } from "@/ecs/World"
import { Velocity } from "@/components/Velocity"
import { solvePseudoVelocities } from "@/collisionDetectionSystem/sequentialImpulse"
import {
	ContactManifolds,
	ContactManifoldsResource,
} from "@/resources/ContactManifolds"
import {
	PseudoVelocities,
	PseudoVelocitiesResource,
} from "@/resources/PseudoVelocities"
import {
	createSolverSettings,
	SolverSettingsResource,
} from "@/resources/SolverSettings"

function createPseudoVelocitySolveSystem(world: World): System {
	if (!world.hasResource(SolverSettingsResource)) {
		world.setResource(SolverSettingsResource, createSolverSettings())
	}
	if (!world.hasResource(ContactManifoldsResource)) {
		world.setResource(ContactManifoldsResource, new ContactManifolds())
	}
	if (!world.hasResource(PseudoVelocitiesResource)) {
		world.setResource(PseudoVelocitiesResource, new PseudoVelocities())
	}
	const velocityStore = world.store(Velocity)

	return (deltaTime) => {
		const settings = world.resource(SolverSettingsResource)
		const manifolds = world.resource(ContactManifoldsResource)
		const pseudo = world.resource(PseudoVelocitiesResource)
		pseudo.ensureCapacity(velocityStore.size)
		pseudo.clear()
		for (let pass = 0; pass < settings.pseudoVelocityIterations; pass++) {
			solvePseudoVelocities(manifolds, pseudo, settings, deltaTime)
		}
	}
}

export { createPseudoVelocitySolveSystem }
