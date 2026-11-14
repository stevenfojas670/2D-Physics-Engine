import type { System } from "@/ecs/Schedule"
import type { World } from "@/ecs/World"
import { RenderContextResource } from "./RenderContext"

function createDrawFlushSystem(world: World): System {
	return () => {
		const render = world.resource(RenderContextResource)
		render.drawCalls = render.batches.flush(render.ctx)
		render.batches.clear()
	}
}

export { createDrawFlushSystem }
