import type { System } from "@/ecs/Schedule"
import type { World } from "@/ecs/World"
import { Velocity } from "@/components/Velocity"
import {
	prepareContacts,
	recordFrictionArrows,
	solveVelocities,
	warmStart,
} from "@/collisionDetectionSystem/sequentialImpulse"
import { ContactsResource } from "@/resources/ContactLog"
import {
	ContactManifolds,
	ContactManifoldsResource,
} from "@/resources/ContactManifolds"
import {
	createSolverSettings,
	SolverSettingsResource,
} from "@/resources/SolverSettings"

function createVelocitySolveSystem(world: World): System {
	if (!world.hasResource(SolverSettingsResource)) {
		world.setResource(SolverSettingsResource, createSolverSettings())
	}
	if (!world.hasResource(ContactManifoldsResource)) {
		world.setResource(ContactManifoldsResource, new ContactManifolds())
	}
	const velocities = world.store(Velocity).columns

	return () => {
		const settings = world.resource(SolverSettingsResource)
		const manifolds = world.resource(ContactManifoldsResource)
		prepareContacts(manifolds, velocities, settings)
		warmStart(manifolds, velocities)
		for (let pass = 0; pass < settings.velocityIterations; pass++) {
			solveVelocities(manifolds, velocities)
		}
		if (world.hasResource(ContactsResource)) {
			recordFrictionArrows(manifolds, world.resource(ContactsResource))
		}
	}
}

export { createVelocitySolveSystem }
