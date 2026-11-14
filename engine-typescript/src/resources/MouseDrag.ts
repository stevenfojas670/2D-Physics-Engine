import { defineResource } from "@/ecs/defineResource"
import type { Entity } from "@/ecs/Entity"

interface MouseDrag {
	active: boolean
	entity: Entity
	localAnchorX: number
	localAnchorY: number
	targetX: number
	targetY: number
}

function createMouseDrag(): MouseDrag {
	return {
		active: false,
		entity: 0,
		localAnchorX: 0,
		localAnchorY: 0,
		targetX: 0,
		targetY: 0,
	}
}

const MouseDragResource = defineResource<MouseDrag>("MouseDrag")

export type { MouseDrag }
export { createMouseDrag, MouseDragResource }
