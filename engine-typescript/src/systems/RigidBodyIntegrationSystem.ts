import type { System } from "@/ecs/Schedule"
import type { World } from "@/ecs/World"
import { ForceAccumulator } from "@/components/ForceAccumulator"
import { LinearDamping } from "@/components/LinearDamping"
import { Mass } from "@/components/Mass"
import { Particle } from "@/components/Particle"
import { Sleep } from "@/components/Sleep"
import { Transform } from "@/components/Transform"
import { Velocity } from "@/components/Velocity"

function createRigidBodyIntegrationSystem(world: World): System {
	const transforms = world.store(Transform).columns
	const velocities = world.store(Velocity).columns
	const forces = world.store(ForceAccumulator).columns
	const masses = world.store(Mass).columns
	const dampings = world.store(LinearDamping).columns
	const sleeps = world.store(Sleep).columns
	const bodies = world.view(
		[Transform, Velocity, ForceAccumulator, Mass, LinearDamping, Sleep],
		{ without: [Particle] },
	)
	let stepDeltaTime = 0

	const integrate = (
		transformSlot: number,
		velocitySlot: number,
		forceSlot: number,
		massSlot: number,
		dampingSlot: number,
		sleepSlot: number,
	): void => {
		const deltaTime = stepDeltaTime
		const inverseMass = masses.inverseMass[massSlot]
		let velocityX =
			velocities.x[velocitySlot] + forces.x[forceSlot] * inverseMass * deltaTime
		let velocityY =
			velocities.y[velocitySlot] + forces.y[forceSlot] * inverseMass * deltaTime
		transforms.x[transformSlot] += velocityX * deltaTime
		transforms.y[transformSlot] += velocityY * deltaTime

		let angularVelocity =
			velocities.angular[velocitySlot] +
			forces.torque[forceSlot] * masses.inverseInertia[massSlot] * deltaTime
		transforms.angle[transformSlot] += angularVelocity * deltaTime

		velocityX *= dampings.linear[dampingSlot]
		velocityY *= dampings.linear[dampingSlot]
		angularVelocity *= dampings.angular[dampingSlot]

		const linearThreshold = sleeps.linearThreshold[sleepSlot]
		if (
			velocityX * velocityX + velocityY * velocityY <
			linearThreshold * linearThreshold
		) {
			velocityX = 0
			velocityY = 0
		}
		if (Math.abs(angularVelocity) < sleeps.angularThreshold[sleepSlot]) {
			angularVelocity = 0
		}

		velocities.x[velocitySlot] = velocityX
		velocities.y[velocitySlot] = velocityY
		velocities.angular[velocitySlot] = angularVelocity
		forces.x[forceSlot] = 0
		forces.y[forceSlot] = 0
		forces.torque[forceSlot] = 0
	}

	return (deltaTime) => {
		stepDeltaTime = deltaTime
		bodies.each(integrate)
	}
}

export { createRigidBodyIntegrationSystem }
