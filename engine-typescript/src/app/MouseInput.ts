import { defineResource } from "@/ecs/defineResource"

interface MouseInput {
	x: number
	y: number
	leftDown: boolean
}

function createMouseInput(): MouseInput {
	return { x: 0, y: 0, leftDown: false }
}

const MouseInputResource = defineResource<MouseInput>("MouseInput")

export type { MouseInput }
export { createMouseInput, MouseInputResource }
