import type { Entity } from "@/ecs/Entity"
import type { ContactLog } from "@/resources/ContactLog"
import { translateCollider } from "@/shapes/colliderGeometry"
import type { BodyColumns } from "./BodyColumns"
import type { Contact } from "./Contact"

const POSITIONAL_CORRECTION_PERCENT = 0.9
const TANGENT_THRESHOLD = 0.00001
const FRICTION_ARROW_LENGTH = 40
const MISSING_SLOT = -1

function inverseMassOf(bodies: BodyColumns, entity: Entity): number {
	const slot = bodies.masses.slotOf(entity)
	return slot === MISSING_SLOT ? 0 : bodies.masses.columns.inverseMass[slot]
}

function inverseInertiaOf(bodies: BodyColumns, entity: Entity): number {
	const slot = bodies.masses.slotOf(entity)
	return slot === MISSING_SLOT ? 0 : bodies.masses.columns.inverseInertia[slot]
}

function moveBody(
	bodies: BodyColumns,
	entity: Entity,
	deltaX: number,
	deltaY: number,
): void {
	const transformSlot = bodies.transforms.slotOf(entity)
	bodies.transforms.columns.x[transformSlot] += deltaX
	bodies.transforms.columns.y[transformSlot] += deltaY
	const colliderSlot = bodies.colliders.slotOf(entity)
	if (colliderSlot !== MISSING_SLOT) {
		translateCollider(bodies.colliders.columns, colliderSlot, deltaX, deltaY)
	}
}

function correctPositions(
	bodies: BodyColumns,
	entityA: Entity,
	entityB: Entity,
	contact: Contact,
): void {
	const inverseMassA = inverseMassOf(bodies, entityA)
	const inverseMassB = inverseMassOf(bodies, entityB)
	const inverseMassSum = inverseMassA + inverseMassB
	if (inverseMassSum === 0) {
		return
	}
	const amount =
		(contact.depth / inverseMassSum) * POSITIONAL_CORRECTION_PERCENT
	const correctionX = contact.normalX * amount
	const correctionY = contact.normalY * amount
	if (inverseMassA > 0) {
		moveBody(
			bodies,
			entityA,
			-correctionX * inverseMassA,
			-correctionY * inverseMassA,
		)
	}
	if (inverseMassB > 0) {
		moveBody(
			bodies,
			entityB,
			correctionX * inverseMassB,
			correctionY * inverseMassB,
		)
	}
}

function resolveImpulse(
	bodies: BodyColumns,
	entityA: Entity,
	entityB: Entity,
	contact: Contact,
	friction: ContactLog | null,
): void {
	const transforms = bodies.transforms.columns
	const velocities = bodies.velocities.columns
	const materials = bodies.materials.columns
	const transformA = bodies.transforms.slotOf(entityA)
	const transformB = bodies.transforms.slotOf(entityB)
	const velocityA = bodies.velocities.slotOf(entityA)
	const velocityB = bodies.velocities.slotOf(entityB)
	const materialA = bodies.materials.slotOf(entityA)
	const materialB = bodies.materials.slotOf(entityB)
	const hasVelocityA = velocityA !== MISSING_SLOT
	const hasVelocityB = velocityB !== MISSING_SLOT

	const inverseMassA = inverseMassOf(bodies, entityA)
	const inverseMassB = inverseMassOf(bodies, entityB)
	const inverseInertiaA = inverseInertiaOf(bodies, entityA)
	const inverseInertiaB = inverseInertiaOf(bodies, entityB)

	let linearAX = hasVelocityA ? velocities.x[velocityA] : 0
	let linearAY = hasVelocityA ? velocities.y[velocityA] : 0
	let angularA = hasVelocityA ? velocities.angular[velocityA] : 0
	let linearBX = hasVelocityB ? velocities.x[velocityB] : 0
	let linearBY = hasVelocityB ? velocities.y[velocityB] : 0
	let angularB = hasVelocityB ? velocities.angular[velocityB] : 0

	const normalX = contact.normalX
	const normalY = contact.normalY
	const leverAX = contact.pointX - transforms.x[transformA]
	const leverAY = contact.pointY - transforms.y[transformA]
	const leverBX = contact.pointX - transforms.x[transformB]
	const leverBY = contact.pointY - transforms.y[transformB]

	const pointVelocityAX = linearAX - angularA * leverAY
	const pointVelocityAY = linearAY + angularA * leverAX
	const pointVelocityBX = linearBX - angularB * leverBY
	const pointVelocityBY = linearBY + angularB * leverBX

	const relativeX = pointVelocityBX - pointVelocityAX
	const relativeY = pointVelocityBY - pointVelocityAY
	const relativeAlongNormal = relativeX * normalX + relativeY * normalY
	if (relativeAlongNormal > 0) {
		return
	}

	const restitutionA = materials.restitution[materialA]
	const restitutionB = materials.restitution[materialB]
	const restitution =
		(2 * restitutionA * restitutionB) / (restitutionA + restitutionB)
	const normalLengthSquared = normalX * normalX + normalY * normalY

	const leverACrossNormal = leverAX * normalY - leverAY * normalX
	const leverBCrossNormal = leverBX * normalY - leverBY * normalX
	const angularNormalTerm =
		leverACrossNormal * leverACrossNormal * inverseInertiaA +
		leverBCrossNormal * leverBCrossNormal * inverseInertiaB
	const linearImpulse =
		(-(restitution + 1) * relativeAlongNormal) /
		((inverseMassA + inverseMassB + angularNormalTerm) * normalLengthSquared)

	linearAX -= normalX * linearImpulse * inverseMassA
	linearAY -= normalY * linearImpulse * inverseMassA
	linearBX += normalX * linearImpulse * inverseMassB
	linearBY += normalY * linearImpulse * inverseMassB
	angularA += -leverACrossNormal * linearImpulse * inverseInertiaA
	angularB += leverBCrossNormal * linearImpulse * inverseInertiaB

	let tangentX = -(relativeX - normalX * relativeAlongNormal)
	let tangentY = -(relativeY - normalY * relativeAlongNormal)
	const frictionCoefficient = Math.min(
		materials.friction[materialA],
		materials.friction[materialB],
	)

	if (tangentX > TANGENT_THRESHOLD || tangentY > TANGENT_THRESHOLD) {
		const tangentLength = Math.hypot(tangentX, tangentY)
		tangentX /= tangentLength
		tangentY /= tangentLength
		if (friction !== null) {
			const centroidX = transforms.x[transformA]
			const centroidY = transforms.y[transformA]
			friction.recordFriction(
				centroidX,
				centroidY,
				centroidX + tangentX * FRICTION_ARROW_LENGTH,
				centroidY + tangentY * FRICTION_ARROW_LENGTH,
			)
		}
	}

	const leverACrossTangent = leverAX * tangentY - leverAY * tangentX
	const leverBCrossTangent = leverBX * tangentY - leverBY * tangentX
	const angularTangentTerm =
		leverACrossTangent * leverACrossTangent * inverseInertiaA +
		leverBCrossTangent * leverBCrossTangent * inverseInertiaB
	let frictionImpulse =
		(-(restitution + 1) *
			(relativeX * tangentX + relativeY * tangentY) *
			frictionCoefficient) /
		((inverseMassA + inverseMassB + angularTangentTerm) * normalLengthSquared)
	if (frictionImpulse > linearImpulse) {
		frictionImpulse = linearImpulse
	}

	linearAX -= tangentX * frictionImpulse * inverseMassA
	linearAY -= tangentY * frictionImpulse * inverseMassA
	linearBX += tangentX * frictionImpulse * inverseMassB
	linearBY += tangentY * frictionImpulse * inverseMassB
	angularA += -leverACrossTangent * frictionImpulse * inverseInertiaA
	angularB += leverBCrossTangent * frictionImpulse * inverseInertiaB

	if (hasVelocityA) {
		velocities.x[velocityA] = linearAX
		velocities.y[velocityA] = linearAY
		velocities.angular[velocityA] = angularA
	}
	if (hasVelocityB) {
		velocities.x[velocityB] = linearBX
		velocities.y[velocityB] = linearBY
		velocities.angular[velocityB] = angularB
	}
}

export { correctPositions, resolveImpulse }
