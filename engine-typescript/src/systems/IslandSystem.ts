import type { Entity } from "@/ecs/Entity"
import type { System } from "@/ecs/Schedule"
import type { World } from "@/ecs/World"
import { Asleep } from "@/components/Asleep"
import { ForceJoint } from "@/components/ForceJoint"
import { Mass } from "@/components/Mass"
import { Particle } from "@/components/Particle"
import { SpringJoint } from "@/components/SpringJoint"
import { Velocity } from "@/components/Velocity"
import {
	ContactManifolds,
	ContactManifoldsResource,
} from "@/resources/ContactManifolds"
import { Islands, IslandsResource } from "@/resources/Islands"
import { SleepSettingsResource } from "@/resources/SleepSettings"
import { installSleepResources } from "@/sleeping/wakeBodies"

interface JointEnds {
	readonly entityA: ArrayLike<number>
	readonly entityB: ArrayLike<number>
}

function createIslandSystem(world: World): System {
	installSleepResources(world)
	if (!world.hasResource(IslandsResource)) {
		world.setResource(IslandsResource, new Islands())
	}
	if (!world.hasResource(ContactManifoldsResource)) {
		world.setResource(ContactManifoldsResource, new ContactManifolds())
	}
	const masses = world.store(Mass).columns
	const springs = world.store(SpringJoint)
	const forceJoints = world.store(ForceJoint)
	const bodies = world.view([Velocity, Mass], { without: [Asleep, Particle] })
	let islands: Islands

	const addBody = (
		velocitySlot: number,
		massSlot: number,
		entity: Entity,
	): void => {
		void velocitySlot
		if (masses.inverseMass[massSlot] > 0) {
			islands.addBody(entity)
		}
	}

	const linkJoints = (ends: JointEnds, jointCount: number): void => {
		for (let slot = 0; slot < jointCount; slot++) {
			islands.link(ends.entityA[slot], ends.entityB[slot])
		}
	}

	return () => {
		if (!world.resource(SleepSettingsResource).enabled) {
			return
		}
		islands = world.resource(IslandsResource)
		const manifolds = world.resource(ContactManifoldsResource)
		islands.begin(world.entityCapacity)
		bodies.each(addBody)
		const columns = manifolds.columns
		for (let manifold = 0; manifold < manifolds.count; manifold++) {
			islands.link(columns.entityA[manifold], columns.entityB[manifold])
		}
		linkJoints(springs.columns, springs.size)
		linkJoints(forceJoints.columns, forceJoints.size)
		islands.finish()
	}
}

export { createIslandSystem }
