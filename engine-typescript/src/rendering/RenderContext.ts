import { defineResource } from "@/ecs/defineResource"
import type { BatchCanvas, DrawBatches } from "./DrawBatches"

interface RenderContext {
	ctx: BatchCanvas
	batches: DrawBatches
	drawCalls: number
}

const RenderContextResource = defineResource<RenderContext>("RenderContext")

export type { RenderContext }
export { RenderContextResource }
