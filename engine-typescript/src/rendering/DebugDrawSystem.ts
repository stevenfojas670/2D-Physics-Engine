import type { System } from "@/ecs/Schedule"
import type { World } from "@/ecs/World"
import { Collider } from "@/components/Collider"
import { Particle } from "@/components/Particle"
import { Transform } from "@/components/Transform"
import { anchorWorldPosition } from "@/joints/jointForces"
import { BroadPhaseResource } from "@/resources/BroadPhase"
import {
	CONTACT_STRIDE,
	ContactsResource,
	FRICTION_STRIDE,
} from "@/resources/ContactLog"
import type { ContactLog } from "@/resources/ContactLog"
import { MouseDragResource } from "@/resources/MouseDrag"
import { ColliderKind } from "@/shapes/colliderShapes"
import type { DebugOptions } from "./DebugOptions"
import { DebugOptionsResource } from "./DebugOptions"
import type { DrawBatches } from "./DrawBatches"
import { RenderContextResource } from "./RenderContext"

const NORMAL_LENGTH = 15
const NORMAL_COLOR = "black"
const TOUCHING_BOX_COLOR = "red"
const IDLE_BOX_COLOR = "gray"
const FRICTION_COLOR = "blue"
const DRAG_LINE_COLOR = "black"
const DRAG_ANCHOR_COLOR = "green"
const DRAG_ANCHOR_RADIUS = 5
const CONTACT_COLOR = "gray"
const CONTACT_POINT_RADIUS = 3
const GRID_CELL_COLOR = "grey"
const GRID_CELL_INSET = 5

function createDebugDrawSystem(world: World): System {
	const transforms = world.store(Transform)
	const colliders = world.store(Collider).columns
	const colliderView = world.view([Collider], { without: [Particle] })
	const dragAnchor = { x: 0, y: 0 }
	let batches: DrawBatches
	let options: DebugOptions

	const drawColliderDebug = (colliderSlot: number): void => {
		if (
			options.normals &&
			colliders.kind[colliderSlot] === ColliderKind.POLYGON
		) {
			drawNormals(colliderSlot)
		}
		if (options.boundingBoxes) {
			const minX = colliders.minX[colliderSlot]
			const minY = colliders.minY[colliderSlot]
			batches.rect(
				minX,
				minY,
				colliders.maxX[colliderSlot] - minX,
				colliders.maxY[colliderSlot] - minY,
				colliders.touching[colliderSlot] === 1
					? TOUCHING_BOX_COLOR
					: IDLE_BOX_COLOR,
			)
		}
	}

	const drawNormals = (colliderSlot: number): void => {
		const vertices = colliders.worldVertices[colliderSlot]
		const normals = colliders.worldNormals[colliderSlot]
		if (vertices === undefined || normals === undefined) {
			return
		}
		const lastOffset = vertices.length - 2
		for (let offset = 0; offset < vertices.length; offset += 2) {
			const nextOffset = offset === lastOffset ? 0 : offset + 2
			const midX = (vertices[offset] + vertices[nextOffset]) * 0.5
			const midY = (vertices[offset + 1] + vertices[nextOffset + 1]) * 0.5
			batches.line(
				midX,
				midY,
				midX + normals[offset] * NORMAL_LENGTH,
				midY + normals[offset + 1] * NORMAL_LENGTH,
				NORMAL_COLOR,
			)
		}
	}

	const drawFriction = (contacts: ContactLog): void => {
		const arrows = contacts.frictionArrows
		for (let arrow = 0; arrow < contacts.frictionCount; arrow++) {
			const offset = arrow * FRICTION_STRIDE
			batches.arrow(
				arrows[offset],
				arrows[offset + 1],
				arrows[offset + 2],
				arrows[offset + 3],
				FRICTION_COLOR,
			)
		}
	}

	const drawContacts = (contacts: ContactLog): void => {
		const records = contacts.contacts
		for (let contact = 0; contact < contacts.contactCount; contact++) {
			const offset = contact * CONTACT_STRIDE
			const pointX = records[offset]
			const pointY = records[offset + 1]
			const depth = records[offset + 4]
			batches.arrow(
				pointX - records[offset + 2] * depth,
				pointY - records[offset + 3] * depth,
				pointX,
				pointY,
				CONTACT_COLOR,
			)
			batches.fillCircle(pointX, pointY, CONTACT_POINT_RADIUS, CONTACT_COLOR)
		}
	}

	const drawMouseDrag = (): void => {
		const drag = world.resource(MouseDragResource)
		if (!drag.active || !world.isAlive(drag.entity)) {
			return
		}
		const transformSlot = transforms.slotOf(drag.entity)
		if (transformSlot === -1) {
			return
		}
		anchorWorldPosition(
			transforms.columns,
			transformSlot,
			drag.localAnchorX,
			drag.localAnchorY,
			dragAnchor,
		)
		batches.line(
			dragAnchor.x,
			dragAnchor.y,
			drag.targetX,
			drag.targetY,
			DRAG_LINE_COLOR,
		)
		batches.fillCircle(
			dragAnchor.x,
			dragAnchor.y,
			DRAG_ANCHOR_RADIUS,
			DRAG_ANCHOR_COLOR,
		)
	}

	const drawGridCell = (x: number, y: number, size: number): void => {
		batches.rect(
			x + GRID_CELL_INSET,
			y + GRID_CELL_INSET,
			size - GRID_CELL_INSET,
			size - GRID_CELL_INSET,
			GRID_CELL_COLOR,
		)
	}

	return () => {
		batches = world.resource(RenderContextResource).batches
		options = world.resource(DebugOptionsResource)
		if (options.normals || options.boundingBoxes) {
			colliderView.each(drawColliderDebug)
		}
		if (world.hasResource(ContactsResource)) {
			const contacts = world.resource(ContactsResource)
			if (options.friction) {
				drawFriction(contacts)
			}
			if (options.contacts) {
				drawContacts(contacts)
			}
		}
		if (options.mouseDrag && world.hasResource(MouseDragResource)) {
			drawMouseDrag()
		}
		if (options.gridCells && world.hasResource(BroadPhaseResource)) {
			world.resource(BroadPhaseResource).forEachCellRect?.(drawGridCell)
		}
	}
}

export { createDebugDrawSystem }
