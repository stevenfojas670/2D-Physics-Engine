import type { System } from "@/ecs/Schedule"
import type { World } from "@/ecs/World"
import { Acceleration } from "@/components/Acceleration"
import { ForceAccumulator } from "@/components/ForceAccumulator"
import { Mass } from "@/components/Mass"
import { ParticleDamping } from "@/components/ParticleDamping"
import { Transform } from "@/components/Transform"
import { Velocity } from "@/components/Velocity"

function createParticleIntegrationSystem(world: World): System {
	const transforms = world.store(Transform).columns
	const velocities = world.store(Velocity).columns
	const forces = world.store(ForceAccumulator).columns
	const masses = world.store(Mass).columns
	const accelerations = world.store(Acceleration).columns
	const dampings = world.store(ParticleDamping).columns
	const particles = world.view([
		Transform,
		Velocity,
		ForceAccumulator,
		Mass,
		Acceleration,
		ParticleDamping,
	])
	let stepDeltaTime = 0

	const integrate = (
		transformSlot: number,
		velocitySlot: number,
		forceSlot: number,
		massSlot: number,
		accelerationSlot: number,
		dampingSlot: number,
	): void => {
		const deltaTime = stepDeltaTime
		const inverseMass = masses.inverseMass[massSlot]
		const accelerationX =
			accelerations.x[accelerationSlot] + forces.x[forceSlot] * inverseMass
		const accelerationY =
			accelerations.y[accelerationSlot] + forces.y[forceSlot] * inverseMass
		velocities.x[velocitySlot] += accelerationX * deltaTime
		velocities.y[velocitySlot] += accelerationY * deltaTime
		transforms.x[transformSlot] += velocities.x[velocitySlot] * deltaTime
		transforms.y[transformSlot] += velocities.y[velocitySlot] * deltaTime
		const damping = Math.pow(dampings.perSecond[dampingSlot], deltaTime)
		velocities.x[velocitySlot] *= damping
		velocities.y[velocitySlot] *= damping
		forces.x[forceSlot] = 0
		forces.y[forceSlot] = 0
		forces.torque[forceSlot] = 0
	}

	return (deltaTime) => {
		stepDeltaTime = deltaTime
		particles.each(integrate)
	}
}

export { createParticleIntegrationSystem }
