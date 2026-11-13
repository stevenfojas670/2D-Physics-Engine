import type { System } from "@/ecs/Schedule"
import type { World } from "@/ecs/World"
import { ForceAccumulator } from "@/components/ForceAccumulator"
import { MovementIntent } from "@/components/MovementIntent"

const MOVE_SPEED = 5
const MOVE_FORCE = 100
const FORCE_PER_AXIS = MOVE_SPEED * MOVE_FORCE
const JUMP_MULTIPLIER = 10

function createIntentForceSystem(world: World): System {
	const intents = world.store(MovementIntent).columns
	const forces = world.store(ForceAccumulator).columns
	const movers = world.view([MovementIntent, ForceAccumulator])

	const applyIntent = (intentSlot: number, forceSlot: number): void => {
		forces.x[forceSlot] += intents.x[intentSlot] * FORCE_PER_AXIS
		forces.y[forceSlot] += intents.y[intentSlot] * FORCE_PER_AXIS
		if (intents.jump[intentSlot] === 1) {
			forces.y[forceSlot] -= FORCE_PER_AXIS * JUMP_MULTIPLIER
		}
	}

	return () => {
		movers.each(applyIntent)
	}
}

export { createIntentForceSystem }
