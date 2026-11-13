import { defineResource } from "@/ecs/defineResource"

interface DebugOptions {
	normals: boolean
	boundingBoxes: boolean
	friction: boolean
	mouseDrag: boolean
	contacts: boolean
	gridCells: boolean
}

function createDebugOptions(): DebugOptions {
	return {
		normals: true,
		boundingBoxes: true,
		friction: true,
		mouseDrag: true,
		contacts: false,
		gridCells: false,
	}
}

const DebugOptionsResource = defineResource<DebugOptions>("DebugOptions")

export type { DebugOptions }
export { createDebugOptions, DebugOptionsResource }
