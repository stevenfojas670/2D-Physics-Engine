import type { System } from "@/ecs/Schedule"
import type { World } from "@/ecs/World"
import { Collider } from "@/components/Collider"
import { ForceAccumulator } from "@/components/ForceAccumulator"
import { Transform } from "@/components/Transform"
import { addForceAtPoint, anchorWorldPosition } from "@/joints/jointForces"
import { BroadPhaseResource } from "@/resources/BroadPhase"
import { MouseDragResource, createMouseDrag } from "@/resources/MouseDrag"
import type { MouseDrag } from "@/resources/MouseDrag"
import { isPointInsideCollider } from "@/shapes/colliderGeometry"
import { MouseInputResource } from "./MouseInput"
import type { MouseInput } from "./MouseInput"

function createMouseDragSystem(world: World): System {
	const transforms = world.store(Transform)
	const forces = world.store(ForceAccumulator)
	const colliders = world.store(Collider)
	const anchor = { x: 0, y: 0 }
	if (!world.hasResource(MouseDragResource)) {
		world.setResource(MouseDragResource, createMouseDrag())
	}

	const pickBodyUnderMouse = (drag: MouseDrag, mouse: MouseInput): void => {
		const grid = world.resource(BroadPhaseResource)
		const candidates = grid.entitiesInCell(grid.cellAt(mouse.x, mouse.y))
		for (let index = 0; index < candidates.length; index++) {
			const entity = candidates[index]
			const colliderSlot = colliders.slotOf(entity)
			const transformSlot = transforms.slotOf(entity)
			if (colliderSlot === -1 || transformSlot === -1) {
				continue
			}
			const centerX = transforms.columns.x[transformSlot]
			const centerY = transforms.columns.y[transformSlot]
			const inside = isPointInsideCollider(
				colliders.columns,
				colliderSlot,
				centerX,
				centerY,
				mouse.x,
				mouse.y,
			)
			if (inside) {
				const angle = transforms.columns.angle[transformSlot]
				const cos = Math.cos(-angle)
				const sin = Math.sin(-angle)
				const offsetX = mouse.x - centerX
				const offsetY = mouse.y - centerY
				drag.entity = entity
				drag.localAnchorX = offsetX * cos - offsetY * sin
				drag.localAnchorY = offsetX * sin + offsetY * cos
				drag.active = true
				return
			}
		}
	}

	const pullDraggedBody = (drag: MouseDrag, mouse: MouseInput): void => {
		const transformSlot = transforms.slotOf(drag.entity)
		if (!world.isAlive(drag.entity) || transformSlot === -1) {
			drag.active = false
			return
		}
		drag.targetX = mouse.x
		drag.targetY = mouse.y
		anchorWorldPosition(
			transforms.columns,
			transformSlot,
			drag.localAnchorX,
			drag.localAnchorY,
			anchor,
		)
		addForceAtPoint(
			transforms,
			forces,
			drag.entity,
			anchor.x,
			anchor.y,
			mouse.x - anchor.x,
			mouse.y - anchor.y,
		)
	}

	return () => {
		const drag = world.resource(MouseDragResource)
		const mouse = world.resource(MouseInputResource)
		if (!mouse.leftDown) {
			drag.active = false
			return
		}
		if (!drag.active) {
			pickBodyUnderMouse(drag, mouse)
		}
		if (drag.active) {
			pullDraggedBody(drag, mouse)
		}
	}
}

export { createMouseDragSystem }
