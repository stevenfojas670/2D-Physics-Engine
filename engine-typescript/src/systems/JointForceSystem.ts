import type { System } from "@/ecs/Schedule"
import type { World } from "@/ecs/World"
import { ForceAccumulator } from "@/components/ForceAccumulator"
import { ForceJoint } from "@/components/ForceJoint"
import { Mass } from "@/components/Mass"
import { SpringJoint } from "@/components/SpringJoint"
import { Transform } from "@/components/Transform"
import {
	StretchState,
	addForceAtPoint,
	anchorWorldPosition,
} from "@/joints/jointForces"

const COMPRESSION_THRESHOLD = -5
const SHARED_FORCE = 0.5
const FULL_FORCE = 1

function createJointForceSystem(world: World): System {
	const transforms = world.store(Transform)
	const forces = world.store(ForceAccumulator)
	const masses = world.store(Mass)
	const springs = world.store(SpringJoint).columns
	const forceJoints = world.store(ForceJoint).columns
	const springView = world.view([SpringJoint])
	const forceJointView = world.view([ForceJoint])
	const anchorA = { x: 0, y: 0 }
	const anchorB = { x: 0, y: 0 }

	const isMovable = (entity: number): boolean => {
		const slot = masses.slotOf(entity)
		return slot !== -1 && masses.columns.inverseMass[slot] !== 0
	}

	const locateAnchors = (
		entityA: number,
		entityB: number,
		anchorAX: number,
		anchorAY: number,
		anchorBX: number,
		anchorBY: number,
	): boolean => {
		if (!world.isAlive(entityA) || !world.isAlive(entityB)) {
			return false
		}
		const transformSlotA = transforms.slotOf(entityA)
		const transformSlotB = transforms.slotOf(entityB)
		if (transformSlotA === -1 || transformSlotB === -1) {
			return false
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
		return true
	}

	const applySpring = (springSlot: number): void => {
		const entityA = springs.entityA[springSlot]
		const entityB = springs.entityB[springSlot]
		const located = locateAnchors(
			entityA,
			entityB,
			springs.anchorAX[springSlot],
			springs.anchorAY[springSlot],
			springs.anchorBX[springSlot],
			springs.anchorBY[springSlot],
		)
		if (!located) {
			return
		}
		const deltaX = anchorB.x - anchorA.x
		const deltaY = anchorB.y - anchorA.y
		const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
		const restLength = springs.restLength[springSlot]
		const extension = distance - restLength
		springs.stretchState[springSlot] =
			extension <= COMPRESSION_THRESHOLD
				? StretchState.COMPRESSED
				: StretchState.STRETCHED
		if (distance === 0) {
			return
		}
		const baseMagnitude =
			(extension * restLength * springs.springConstant[springSlot]) / distance
		const magnitudeA =
			baseMagnitude * (isMovable(entityB) ? SHARED_FORCE : FULL_FORCE)
		const magnitudeB =
			baseMagnitude * (isMovable(entityA) ? SHARED_FORCE : FULL_FORCE)
		addForceAtPoint(
			transforms,
			forces,
			entityA,
			anchorA.x,
			anchorA.y,
			deltaX * magnitudeA,
			deltaY * magnitudeA,
		)
		addForceAtPoint(
			transforms,
			forces,
			entityB,
			anchorB.x,
			anchorB.y,
			-deltaX * magnitudeB,
			-deltaY * magnitudeB,
		)
	}

	const applyForceJoint = (forceJointSlot: number): void => {
		const entityA = forceJoints.entityA[forceJointSlot]
		const entityB = forceJoints.entityB[forceJointSlot]
		const located = locateAnchors(
			entityA,
			entityB,
			forceJoints.anchorAX[forceJointSlot],
			forceJoints.anchorAY[forceJointSlot],
			forceJoints.anchorBX[forceJointSlot],
			forceJoints.anchorBY[forceJointSlot],
		)
		if (!located) {
			return
		}
		const deltaX = anchorB.x - anchorA.x
		const deltaY = anchorB.y - anchorA.y
		const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
		if (distance === 0) {
			return
		}
		const magnitude =
			(forceJoints.strength[forceJointSlot] * SHARED_FORCE) / distance
		addForceAtPoint(
			transforms,
			forces,
			entityA,
			anchorB.x,
			anchorB.y,
			deltaX * magnitude,
			deltaY * magnitude,
		)
		addForceAtPoint(
			transforms,
			forces,
			entityB,
			anchorA.x,
			anchorA.y,
			-deltaX * magnitude,
			-deltaY * magnitude,
		)
	}

	return () => {
		springView.each(applySpring)
		forceJointView.each(applyForceJoint)
	}
}

export { createJointForceSystem }
