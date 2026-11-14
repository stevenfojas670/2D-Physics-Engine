import type { System } from "@/ecs/Schedule"
import type { World } from "@/ecs/World"
import { Collider } from "@/components/Collider"
import { Particle } from "@/components/Particle"
import { Renderable } from "@/components/Renderable"
import { Transform } from "@/components/Transform"
import { ColliderKind } from "@/shapes/colliderShapes"
import type { DrawBatches } from "./DrawBatches"
import { RenderContextResource } from "./RenderContext"

const CENTROID_RADIUS = 5
const FALLBACK_COLOR = "black"

function createColliderRenderSystem(world: World): System {
	const transforms = world.store(Transform).columns
	const colliders = world.store(Collider).columns
	const renderables = world.store(Renderable).columns
	const drawable = world.view([Transform, Collider, Renderable], {
		without: [Particle],
	})
	let batches: DrawBatches

	const drawCollider = (
		transformSlot: number,
		colliderSlot: number,
		renderableSlot: number,
	): void => {
		const color = renderables.color[renderableSlot] ?? FALLBACK_COLOR
		const x = transforms.x[transformSlot]
		const y = transforms.y[transformSlot]
		if (colliders.kind[colliderSlot] === ColliderKind.CIRCLE) {
			const radius = colliders.radius[colliderSlot]
			const angle = transforms.angle[transformSlot]
			batches.strokeCircle(x, y, radius, color)
			batches.line(
				x,
				y,
				x + Math.cos(angle) * radius,
				y + Math.sin(angle) * radius,
				color,
			)
		} else {
			const vertices = colliders.worldVertices[colliderSlot]
			if (vertices !== undefined) {
				const lastOffset = vertices.length - 2
				for (let offset = 0; offset < vertices.length; offset += 2) {
					const nextOffset = offset === lastOffset ? 0 : offset + 2
					batches.line(
						vertices[offset],
						vertices[offset + 1],
						vertices[nextOffset],
						vertices[nextOffset + 1],
						color,
					)
				}
			}
		}
		batches.fillCircle(x, y, CENTROID_RADIUS, color)
	}

	return () => {
		batches = world.resource(RenderContextResource).batches
		drawable.each(drawCollider)
	}
}

export { createColliderRenderSystem }
