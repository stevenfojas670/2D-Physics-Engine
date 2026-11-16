import type { System } from "@/ecs/Schedule"
import type { World } from "@/ecs/World"
import { Asleep } from "@/components/Asleep"
import { ForceAccumulator } from "@/components/ForceAccumulator"
import { LinearDamping } from "@/components/LinearDamping"
import { Mass } from "@/components/Mass"
import { Particle } from "@/components/Particle"
import { Velocity } from "@/components/Velocity"

function createVelocityIntegrationSystem(world: World): System {
	const velocities = world.store(Velocity).columns
	const forces = world.store(ForceAccumulator).columns
	const masses = world.store(Mass).columns
	const dampings = world.store(LinearDamping).columns
	const bodies = world.view([Velocity, ForceAccumulator, Mass, LinearDamping], {
		without: [Particle, Asleep],
	})
	let stepDeltaTime = 0

	const integrate = (
		velocitySlot: number,
		forceSlot: number,
		massSlot: number,
		dampingSlot: number,
	): void => {
		const deltaTime = stepDeltaTime
		const inverseMass = masses.inverseMass[massSlot]
		let velocityX =
			velocities.x[velocitySlot] + forces.x[forceSlot] * inverseMass * deltaTime
		let velocityY =
			velocities.y[velocitySlot] + forces.y[forceSlot] * inverseMass * deltaTime
		let angularVelocity =
			velocities.angular[velocitySlot] +
			forces.torque[forceSlot] * masses.inverseInertia[massSlot] * deltaTime

		velocityX *= dampings.linear[dampingSlot]
		velocityY *= dampings.linear[dampingSlot]
		angularVelocity *= dampings.angular[dampingSlot]

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

export { createVelocityIntegrationSystem }
