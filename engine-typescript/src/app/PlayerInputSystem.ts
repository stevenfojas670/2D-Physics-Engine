import type { System } from "@/ecs/Schedule"
import type { World } from "@/ecs/World"
import { MovementIntent } from "@/components/MovementIntent"
import { PlayerControlled } from "@/components/PlayerControlled"
import type { ControllerKeys } from "@/types/controller/controller.types"
import { ControllerKeysResource } from "./ControllerKeys"

function axis(positive: boolean, negative: boolean): number {
	return (positive ? 1 : 0) - (negative ? 1 : 0)
}

function createPlayerInputSystem(world: World): System {
	const intents = world.store(MovementIntent).columns
	const players = world.view([MovementIntent, PlayerControlled])
	let keys: ControllerKeys

	const writeIntent = (intentSlot: number): void => {
		intents.x[intentSlot] = axis(keys.KeyD, keys.KeyA)
		intents.y[intentSlot] = axis(keys.KeyS, keys.KeyW)
		intents.jump[intentSlot] = keys.Space ? 1 : 0
	}

	return () => {
		keys = world.resource(ControllerKeysResource)
		players.each(writeIntent)
	}
}

export { createPlayerInputSystem }
