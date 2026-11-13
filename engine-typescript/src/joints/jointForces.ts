import type { ComponentStore } from "@/ecs/ComponentStore"
import type { Columns } from "@/ecs/defineComponent"
import type { Entity } from "@/ecs/Entity"
import type { ForceAccumulator } from "@/components/ForceAccumulator"
import type { Transform } from "@/components/Transform"

type TransformSchema = (typeof Transform)["schema"]
type ForceSchema = (typeof ForceAccumulator)["schema"]

interface Point {
	x: number
	y: number
}

const StretchState = { NEUTRAL: 0, COMPRESSED: 1, STRETCHED: 2 } as const

function anchorWorldPosition(
	transforms: Columns<TransformSchema>,
	slot: number,
	localX: number,
	localY: number,
	out: Point,
): void {
	const angle = transforms.angle[slot]
	const cos = Math.cos(angle)
	const sin = Math.sin(angle)
	out.x = transforms.x[slot] + localX * cos - localY * sin
	out.y = transforms.y[slot] + localX * sin + localY * cos
}

function addForceAtPoint(
	transforms: ComponentStore<TransformSchema>,
	forces: ComponentStore<ForceSchema>,
	entity: Entity,
	pointX: number,
	pointY: number,
	forceX: number,
	forceY: number,
): void {
	const forceSlot = forces.slotOf(entity)
	const transformSlot = transforms.slotOf(entity)
	if (forceSlot === -1 || transformSlot === -1) {
		return
	}
	const leverX = pointX - transforms.columns.x[transformSlot]
	const leverY = pointY - transforms.columns.y[transformSlot]
	forces.columns.x[forceSlot] += forceX
	forces.columns.y[forceSlot] += forceY
	forces.columns.torque[forceSlot] += leverX * forceY - leverY * forceX
}

export type { Point }
export { StretchState, anchorWorldPosition, addForceAtPoint }
