import type { Entity } from "@/ecs/Entity"
import type { System } from "@/ecs/Schedule"
import type { World } from "@/ecs/World"
import { ForceJoint } from "@/components/ForceJoint"
import { SpringJoint } from "@/components/SpringJoint"
import { Transform } from "@/components/Transform"
import { StretchState, anchorWorldPosition } from "@/joints/jointForces"
import type { DrawBatches } from "./DrawBatches"
import { RenderContextResource } from "./RenderContext"

const COMPRESSED_COLOR = "blue"
const STRETCHED_COLOR = "red"
const NEUTRAL_COLOR = "orange"

function stretchColor(stretchState: number): string {
	if (stretchState === StretchState.COMPRESSED) {
		return COMPRESSED_COLOR
	}
	if (stretchState === StretchState.STRETCHED) {
		return STRETCHED_COLOR
	}
	return NEUTRAL_COLOR
}

function createJointRenderSystem(world: World): System {
	const transforms = world.store(Transform)
	const springs = world.store(SpringJoint).columns
	const forceJoints = world.store(ForceJoint).columns
	const springView = world.view([SpringJoint])
	const forceJointView = world.view([ForceJoint])
	const anchorA = { x: 0, y: 0 }
	const anchorB = { x: 0, y: 0 }
	let batches: DrawBatches

	const drawJointLine = (
		entityA: Entity,
		entityB: Entity,
		anchorAX: number,
		anchorAY: number,
		anchorBX: number,
		anchorBY: number,
		color: string,
	): void => {
		if (!world.isAlive(entityA) || !world.isAlive(entityB)) {
			return
		}
		const transformSlotA = transforms.slotOf(entityA)
		const transformSlotB = transforms.slotOf(entityB)
		if (transformSlotA === -1 || transformSlotB === -1) {
			return
		}
		anchorWorldPosition(
			transforms.columns,
			transformSlotA,
			anchorAX,
			anchorAY,
			anchorA,
		)
		anchorWorldPosition(
			transforms.columns,
			transformSlotB,
			anchorBX,
			anchorBY,
			anchorB,
		)
		batches.line(anchorA.x, anchorA.y, anchorB.x, anchorB.y, color)
	}

	const drawSpring = (springSlot: number): void => {
		drawJointLine(
			springs.entityA[springSlot],
			springs.entityB[springSlot],
			springs.anchorAX[springSlot],
			springs.anchorAY[springSlot],
			springs.anchorBX[springSlot],
			springs.anchorBY[springSlot],
			stretchColor(springs.stretchState[springSlot]),
		)
	}

	const drawForceJoint = (forceJointSlot: number): void => {
		drawJointLine(
			forceJoints.entityA[forceJointSlot],
			forceJoints.entityB[forceJointSlot],
			forceJoints.anchorAX[forceJointSlot],
			forceJoints.anchorAY[forceJointSlot],
			forceJoints.anchorBX[forceJointSlot],
			forceJoints.anchorBY[forceJointSlot],
			NEUTRAL_COLOR,
		)
	}

	return () => {
		batches = world.resource(RenderContextResource).batches
		springView.each(drawSpring)
		forceJointView.each(drawForceJoint)
	}
}

export { createJointRenderSystem }
