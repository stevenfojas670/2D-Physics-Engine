import type { Columns } from "@/ecs/defineComponent"
import type { Velocity } from "@/components/Velocity"
import type { ContactLog } from "@/resources/ContactLog"
import type { ContactManifolds } from "@/resources/ContactManifolds"
import { MAX_MANIFOLD_POINTS } from "@/resources/ContactManifolds"
import type { PseudoVelocities } from "@/resources/PseudoVelocities"
import type { SolverSettings } from "@/resources/SolverSettings"

type VelocityColumns = Columns<(typeof Velocity)["schema"]>

interface BodyVelocities {
	x: Float64Array
	y: Float64Array
	angular: Float64Array
}

const IMMOVABLE = -1
const FRICTION_ARROW_LENGTH = 40

function effectiveMass(
	inverseMassSum: number,
	inverseInertiaA: number,
	inverseInertiaB: number,
	leverACrossDirection: number,
	leverBCrossDirection: number,
): number {
	const denominator =
		inverseMassSum +
		inverseInertiaA * leverACrossDirection * leverACrossDirection +
		inverseInertiaB * leverBCrossDirection * leverBCrossDirection
	return denominator > 0 ? 1 / denominator : 0
}

function relativeVelocityAlong(
	bodies: BodyVelocities,
	slotA: number,
	slotB: number,
	anchorAX: number,
	anchorAY: number,
	anchorBX: number,
	anchorBY: number,
	directionX: number,
	directionY: number,
): number {
	let relativeX = 0
	let relativeY = 0
	if (slotB !== IMMOVABLE) {
		const angularB = bodies.angular[slotB]
		relativeX += bodies.x[slotB] - angularB * anchorBY
		relativeY += bodies.y[slotB] + angularB * anchorBX
	}
	if (slotA !== IMMOVABLE) {
		const angularA = bodies.angular[slotA]
		relativeX -= bodies.x[slotA] - angularA * anchorAY
		relativeY -= bodies.y[slotA] + angularA * anchorAX
	}
	return relativeX * directionX + relativeY * directionY
}

function applyImpulse(
	bodies: BodyVelocities,
	manifolds: ContactManifolds,
	manifold: number,
	point: number,
	impulseX: number,
	impulseY: number,
): void {
	const columns = manifolds.columns
	const slotA = columns.velocitySlotA[manifold]
	const slotB = columns.velocitySlotB[manifold]
	if (slotA !== IMMOVABLE) {
		const inverseMass = columns.inverseMassA[manifold]
		bodies.x[slotA] -= impulseX * inverseMass
		bodies.y[slotA] -= impulseY * inverseMass
		bodies.angular[slotA] -=
			columns.inverseInertiaA[manifold] *
			(columns.anchorAX[point] * impulseY - columns.anchorAY[point] * impulseX)
	}
	if (slotB !== IMMOVABLE) {
		const inverseMass = columns.inverseMassB[manifold]
		bodies.x[slotB] += impulseX * inverseMass
		bodies.y[slotB] += impulseY * inverseMass
		bodies.angular[slotB] +=
			columns.inverseInertiaB[manifold] *
			(columns.anchorBX[point] * impulseY - columns.anchorBY[point] * impulseX)
	}
}

function pointVelocityAlong(
	bodies: BodyVelocities,
	manifolds: ContactManifolds,
	manifold: number,
	point: number,
	directionX: number,
	directionY: number,
): number {
	const columns = manifolds.columns
	return relativeVelocityAlong(
		bodies,
		columns.velocitySlotA[manifold],
		columns.velocitySlotB[manifold],
		columns.anchorAX[point],
		columns.anchorAY[point],
		columns.anchorBX[point],
		columns.anchorBY[point],
		directionX,
		directionY,
	)
}

function prepareContacts(
	manifolds: ContactManifolds,
	velocities: VelocityColumns,
	settings: SolverSettings,
): void {
	const columns = manifolds.columns
	for (let manifold = 0; manifold < manifolds.count; manifold++) {
		const normalX = columns.normalX[manifold]
		const normalY = columns.normalY[manifold]
		const tangentX = normalY
		const tangentY = -normalX
		const inverseMassSum =
			columns.inverseMassA[manifold] + columns.inverseMassB[manifold]
		const inverseInertiaA = columns.inverseInertiaA[manifold]
		const inverseInertiaB = columns.inverseInertiaB[manifold]
		const firstPoint = manifold * MAX_MANIFOLD_POINTS
		for (let index = 0; index < columns.pointCount[manifold]; index++) {
			const point = firstPoint + index
			const anchorAX = columns.anchorAX[point]
			const anchorAY = columns.anchorAY[point]
			const anchorBX = columns.anchorBX[point]
			const anchorBY = columns.anchorBY[point]
			columns.normalMass[point] = effectiveMass(
				inverseMassSum,
				inverseInertiaA,
				inverseInertiaB,
				anchorAX * normalY - anchorAY * normalX,
				anchorBX * normalY - anchorBY * normalX,
			)
			columns.tangentMass[point] = effectiveMass(
				inverseMassSum,
				inverseInertiaA,
				inverseInertiaB,
				anchorAX * tangentY - anchorAY * tangentX,
				anchorBX * tangentY - anchorBY * tangentX,
			)
			const closingVelocity = pointVelocityAlong(
				velocities,
				manifolds,
				manifold,
				point,
				normalX,
				normalY,
			)
			columns.velocityBias[point] =
				-closingVelocity > settings.restitutionThreshold
					? -columns.restitution[manifold] * closingVelocity
					: 0
		}
	}
}

function warmStart(
	manifolds: ContactManifolds,
	velocities: VelocityColumns,
): void {
	const columns = manifolds.columns
	for (let manifold = 0; manifold < manifolds.count; manifold++) {
		const normalX = columns.normalX[manifold]
		const normalY = columns.normalY[manifold]
		const firstPoint = manifold * MAX_MANIFOLD_POINTS
		for (let index = 0; index < columns.pointCount[manifold]; index++) {
			const point = firstPoint + index
			const normalImpulse = columns.normalImpulse[point]
			const tangentImpulse = columns.tangentImpulse[point]
			applyImpulse(
				velocities,
				manifolds,
				manifold,
				point,
				normalX * normalImpulse + normalY * tangentImpulse,
				normalY * normalImpulse - normalX * tangentImpulse,
			)
		}
	}
}

function solveVelocities(
	manifolds: ContactManifolds,
	velocities: VelocityColumns,
): void {
	const columns = manifolds.columns
	for (let manifold = 0; manifold < manifolds.count; manifold++) {
		const normalX = columns.normalX[manifold]
		const normalY = columns.normalY[manifold]
		const tangentX = normalY
		const tangentY = -normalX
		const friction = columns.friction[manifold]
		const firstPoint = manifold * MAX_MANIFOLD_POINTS
		for (let index = 0; index < columns.pointCount[manifold]; index++) {
			const point = firstPoint + index

			const tangentVelocity = pointVelocityAlong(
				velocities,
				manifolds,
				manifold,
				point,
				tangentX,
				tangentY,
			)
			const frictionLimit = friction * columns.normalImpulse[point]
			const previousTangent = columns.tangentImpulse[point]
			const nextTangent = Math.max(
				-frictionLimit,
				Math.min(
					frictionLimit,
					previousTangent - columns.tangentMass[point] * tangentVelocity,
				),
			)
			columns.tangentImpulse[point] = nextTangent
			const tangentChange = nextTangent - previousTangent
			applyImpulse(
				velocities,
				manifolds,
				manifold,
				point,
				tangentX * tangentChange,
				tangentY * tangentChange,
			)

			const normalVelocity = pointVelocityAlong(
				velocities,
				manifolds,
				manifold,
				point,
				normalX,
				normalY,
			)
			const previousNormal = columns.normalImpulse[point]
			const nextNormal = Math.max(
				0,
				previousNormal -
					columns.normalMass[point] *
						(normalVelocity - columns.velocityBias[point]),
			)
			columns.normalImpulse[point] = nextNormal
			const normalChange = nextNormal - previousNormal
			applyImpulse(
				velocities,
				manifolds,
				manifold,
				point,
				normalX * normalChange,
				normalY * normalChange,
			)
		}
	}
}

function solvePseudoVelocities(
	manifolds: ContactManifolds,
	pseudo: PseudoVelocities,
	settings: SolverSettings,
	deltaTime: number,
): void {
	const columns = manifolds.columns
	const pushPerDepth = settings.beta / deltaTime
	for (let manifold = 0; manifold < manifolds.count; manifold++) {
		const normalX = columns.normalX[manifold]
		const normalY = columns.normalY[manifold]
		const firstPoint = manifold * MAX_MANIFOLD_POINTS
		for (let index = 0; index < columns.pointCount[manifold]; index++) {
			const point = firstPoint + index
			const target =
				pushPerDepth * Math.max(columns.depth[point] - settings.slop, 0)
			const separatingVelocity = pointVelocityAlong(
				pseudo,
				manifolds,
				manifold,
				point,
				normalX,
				normalY,
			)
			const previous = columns.pseudoImpulse[point]
			const next = Math.max(
				0,
				previous + columns.normalMass[point] * (target - separatingVelocity),
			)
			columns.pseudoImpulse[point] = next
			const change = next - previous
			applyImpulse(
				pseudo,
				manifolds,
				manifold,
				point,
				normalX * change,
				normalY * change,
			)
		}
	}
}

function recordFrictionArrows(
	manifolds: ContactManifolds,
	log: ContactLog,
): void {
	const columns = manifolds.columns
	for (let manifold = 0; manifold < manifolds.count; manifold++) {
		const tangentX = columns.normalY[manifold]
		const tangentY = -columns.normalX[manifold]
		const firstPoint = manifold * MAX_MANIFOLD_POINTS
		for (let index = 0; index < columns.pointCount[manifold]; index++) {
			const point = firstPoint + index
			const impulse = columns.tangentImpulse[point]
			if (impulse === 0) {
				continue
			}
			const direction = Math.sign(impulse) * FRICTION_ARROW_LENGTH
			const fromX = columns.pointX[point]
			const fromY = columns.pointY[point]
			log.recordFriction(
				fromX,
				fromY,
				fromX + tangentX * direction,
				fromY + tangentY * direction,
			)
		}
	}
}

export type { VelocityColumns }
export {
	prepareContacts,
	recordFrictionArrows,
	solvePseudoVelocities,
	solveVelocities,
	warmStart,
}
