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
const BLOCK_POINT_COUNT = 2
const MAX_BLOCK_CONDITION = 1000

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

function applyNormalPair(
	velocities: VelocityColumns,
	manifolds: ContactManifolds,
	manifold: number,
	impulse1: number,
	impulse2: number,
): void {
	const columns = manifolds.columns
	const normalX = columns.normalX[manifold]
	const normalY = columns.normalY[manifold]
	const first = manifold * MAX_MANIFOLD_POINTS
	const change1 = impulse1 - columns.normalImpulse[first]
	const change2 = impulse2 - columns.normalImpulse[first + 1]
	columns.normalImpulse[first] = impulse1
	columns.normalImpulse[first + 1] = impulse2
	applyImpulse(
		velocities,
		manifolds,
		manifold,
		first,
		normalX * change1,
		normalY * change1,
	)
	applyImpulse(
		velocities,
		manifolds,
		manifold,
		first + 1,
		normalX * change2,
		normalY * change2,
	)
}

function solveNormalBlock(
	velocities: VelocityColumns,
	manifolds: ContactManifolds,
	manifold: number,
): boolean {
	const columns = manifolds.columns
	const normalX = columns.normalX[manifold]
	const normalY = columns.normalY[manifold]
	const first = manifold * MAX_MANIFOLD_POINTS
	const second = first + 1
	const inverseMassSum =
		columns.inverseMassA[manifold] + columns.inverseMassB[manifold]
	const inverseInertiaA = columns.inverseInertiaA[manifold]
	const inverseInertiaB = columns.inverseInertiaB[manifold]
	const crossA1 =
		columns.anchorAX[first] * normalY - columns.anchorAY[first] * normalX
	const crossB1 =
		columns.anchorBX[first] * normalY - columns.anchorBY[first] * normalX
	const crossA2 =
		columns.anchorAX[second] * normalY - columns.anchorAY[second] * normalX
	const crossB2 =
		columns.anchorBX[second] * normalY - columns.anchorBY[second] * normalX
	const k11 =
		inverseMassSum +
		inverseInertiaA * crossA1 * crossA1 +
		inverseInertiaB * crossB1 * crossB1
	const k22 =
		inverseMassSum +
		inverseInertiaA * crossA2 * crossA2 +
		inverseInertiaB * crossB2 * crossB2
	const k12 =
		inverseMassSum +
		inverseInertiaA * crossA1 * crossA2 +
		inverseInertiaB * crossB1 * crossB2
	const determinant = k11 * k22 - k12 * k12
	if (k11 * k11 >= MAX_BLOCK_CONDITION * determinant) {
		return false
	}

	const accumulated1 = columns.normalImpulse[first]
	const accumulated2 = columns.normalImpulse[second]
	const velocity1 = pointVelocityAlong(
		velocities,
		manifolds,
		manifold,
		first,
		normalX,
		normalY,
	)
	const velocity2 = pointVelocityAlong(
		velocities,
		manifolds,
		manifold,
		second,
		normalX,
		normalY,
	)
	const target1 =
		velocity1 -
		columns.velocityBias[first] -
		(k11 * accumulated1 + k12 * accumulated2)
	const target2 =
		velocity2 -
		columns.velocityBias[second] -
		(k12 * accumulated1 + k22 * accumulated2)

	const both1 = -(k22 * target1 - k12 * target2) / determinant
	const both2 = -(k11 * target2 - k12 * target1) / determinant
	if (both1 >= 0 && both2 >= 0) {
		applyNormalPair(velocities, manifolds, manifold, both1, both2)
		return true
	}
	const only1 = -target1 / k11
	if (only1 >= 0 && k12 * only1 + target2 >= 0) {
		applyNormalPair(velocities, manifolds, manifold, only1, 0)
		return true
	}
	const only2 = -target2 / k22
	if (only2 >= 0 && k12 * only2 + target1 >= 0) {
		applyNormalPair(velocities, manifolds, manifold, 0, only2)
		return true
	}
	if (target1 >= 0 && target2 >= 0) {
		applyNormalPair(velocities, manifolds, manifold, 0, 0)
	}
	return true
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
		const pointCount = columns.pointCount[manifold]
		for (let index = 0; index < pointCount; index++) {
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
		}
		if (
			pointCount === BLOCK_POINT_COUNT &&
			solveNormalBlock(velocities, manifolds, manifold)
		) {
			continue
		}
		for (let index = 0; index < pointCount; index++) {
			const point = firstPoint + index
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
