import { defineResource } from "@/ecs/defineResource"
import type { Entity } from "@/ecs/Entity"
import { ENTITY_INDEX_BITS, entityIndex } from "@/ecs/Entity"

const MAX_MANIFOLD_POINTS = 2
const INITIAL_MANIFOLD_CAPACITY = 64
const PAIR_KEY_FACTOR = 2 ** ENTITY_INDEX_BITS
const NOT_FOUND = -1

type TypedColumn = Float64Array | Int32Array | Uint32Array | Uint8Array

function grown<T extends TypedColumn>(column: T, length: number): T {
	const constructor = column.constructor as new (length: number) => T
	const copy = new constructor(length)
	copy.set(column)
	return copy
}

function pairKey(entityA: Entity, entityB: Entity): number {
	return entityIndex(entityA) * PAIR_KEY_FACTOR + entityIndex(entityB)
}

class ManifoldColumns {
	capacity: number
	entityA: Uint32Array
	entityB: Uint32Array
	velocitySlotA: Int32Array
	velocitySlotB: Int32Array
	inverseMassA: Float64Array
	inverseMassB: Float64Array
	inverseInertiaA: Float64Array
	inverseInertiaB: Float64Array
	normalX: Float64Array
	normalY: Float64Array
	friction: Float64Array
	restitution: Float64Array
	pointCount: Uint8Array
	pointX: Float64Array
	pointY: Float64Array
	anchorAX: Float64Array
	anchorAY: Float64Array
	anchorBX: Float64Array
	anchorBY: Float64Array
	depth: Float64Array
	normalMass: Float64Array
	tangentMass: Float64Array
	velocityBias: Float64Array
	normalImpulse: Float64Array
	tangentImpulse: Float64Array
	pseudoImpulse: Float64Array
	featureId: Int32Array

	constructor(capacity: number) {
		const points = capacity * MAX_MANIFOLD_POINTS
		this.capacity = capacity
		this.entityA = new Uint32Array(capacity)
		this.entityB = new Uint32Array(capacity)
		this.velocitySlotA = new Int32Array(capacity)
		this.velocitySlotB = new Int32Array(capacity)
		this.inverseMassA = new Float64Array(capacity)
		this.inverseMassB = new Float64Array(capacity)
		this.inverseInertiaA = new Float64Array(capacity)
		this.inverseInertiaB = new Float64Array(capacity)
		this.normalX = new Float64Array(capacity)
		this.normalY = new Float64Array(capacity)
		this.friction = new Float64Array(capacity)
		this.restitution = new Float64Array(capacity)
		this.pointCount = new Uint8Array(capacity)
		this.pointX = new Float64Array(points)
		this.pointY = new Float64Array(points)
		this.anchorAX = new Float64Array(points)
		this.anchorAY = new Float64Array(points)
		this.anchorBX = new Float64Array(points)
		this.anchorBY = new Float64Array(points)
		this.depth = new Float64Array(points)
		this.normalMass = new Float64Array(points)
		this.tangentMass = new Float64Array(points)
		this.velocityBias = new Float64Array(points)
		this.normalImpulse = new Float64Array(points)
		this.tangentImpulse = new Float64Array(points)
		this.pseudoImpulse = new Float64Array(points)
		this.featureId = new Int32Array(points)
	}

	grow(): void {
		const capacity = this.capacity * 2
		const points = capacity * MAX_MANIFOLD_POINTS
		this.capacity = capacity
		this.entityA = grown(this.entityA, capacity)
		this.entityB = grown(this.entityB, capacity)
		this.velocitySlotA = grown(this.velocitySlotA, capacity)
		this.velocitySlotB = grown(this.velocitySlotB, capacity)
		this.inverseMassA = grown(this.inverseMassA, capacity)
		this.inverseMassB = grown(this.inverseMassB, capacity)
		this.inverseInertiaA = grown(this.inverseInertiaA, capacity)
		this.inverseInertiaB = grown(this.inverseInertiaB, capacity)
		this.normalX = grown(this.normalX, capacity)
		this.normalY = grown(this.normalY, capacity)
		this.friction = grown(this.friction, capacity)
		this.restitution = grown(this.restitution, capacity)
		this.pointCount = grown(this.pointCount, capacity)
		this.pointX = grown(this.pointX, points)
		this.pointY = grown(this.pointY, points)
		this.anchorAX = grown(this.anchorAX, points)
		this.anchorAY = grown(this.anchorAY, points)
		this.anchorBX = grown(this.anchorBX, points)
		this.anchorBY = grown(this.anchorBY, points)
		this.depth = grown(this.depth, points)
		this.normalMass = grown(this.normalMass, points)
		this.tangentMass = grown(this.tangentMass, points)
		this.velocityBias = grown(this.velocityBias, points)
		this.normalImpulse = grown(this.normalImpulse, points)
		this.tangentImpulse = grown(this.tangentImpulse, points)
		this.pseudoImpulse = grown(this.pseudoImpulse, points)
		this.featureId = grown(this.featureId, points)
	}
}

class ContactManifolds {
	private current = new ManifoldColumns(INITIAL_MANIFOLD_CAPACITY)
	private previous = new ManifoldColumns(INITIAL_MANIFOLD_CAPACITY)
	private currentCount = 0
	private previousCount = 0
	private readonly previousByPair = new Map<number, number>()

	get count(): number {
		return this.currentCount
	}

	get columns(): ManifoldColumns {
		return this.current
	}

	beginStep(): void {
		const finished = this.current
		this.current = this.previous
		this.previous = finished
		this.previousCount = this.currentCount
		this.currentCount = 0
		this.previousByPair.clear()
		for (let manifold = 0; manifold < this.previousCount; manifold++) {
			this.previousByPair.set(
				pairKey(finished.entityA[manifold], finished.entityB[manifold]),
				manifold,
			)
		}
	}

	add(entityA: Entity, entityB: Entity): number {
		if (this.currentCount === this.current.capacity) {
			this.current.grow()
		}
		const manifold = this.currentCount++
		const columns = this.current
		columns.entityA[manifold] = entityA
		columns.entityB[manifold] = entityB
		columns.pointCount[manifold] = 0
		const firstPoint = manifold * MAX_MANIFOLD_POINTS
		for (let point = 0; point < MAX_MANIFOLD_POINTS; point++) {
			columns.normalImpulse[firstPoint + point] = 0
			columns.tangentImpulse[firstPoint + point] = 0
			columns.pseudoImpulse[firstPoint + point] = 0
		}
		return manifold
	}

	inheritImpulses(manifold: number): void {
		const columns = this.current
		const previous = this.previous
		const entityA = columns.entityA[manifold]
		const entityB = columns.entityB[manifold]
		const match =
			this.previousByPair.get(pairKey(entityA, entityB)) ?? NOT_FOUND
		if (
			match === NOT_FOUND ||
			previous.entityA[match] !== entityA ||
			previous.entityB[match] !== entityB
		) {
			return
		}
		const firstPoint = manifold * MAX_MANIFOLD_POINTS
		const firstPrevious = match * MAX_MANIFOLD_POINTS
		for (let point = 0; point < columns.pointCount[manifold]; point++) {
			const feature = columns.featureId[firstPoint + point]
			for (let old = 0; old < previous.pointCount[match]; old++) {
				if (previous.featureId[firstPrevious + old] === feature) {
					columns.normalImpulse[firstPoint + point] =
						previous.normalImpulse[firstPrevious + old]
					columns.tangentImpulse[firstPoint + point] =
						previous.tangentImpulse[firstPrevious + old]
				}
			}
		}
	}
}

const ContactManifoldsResource =
	defineResource<ContactManifolds>("ContactManifolds")

export type { ManifoldColumns }
export { ContactManifolds, ContactManifoldsResource, MAX_MANIFOLD_POINTS }
