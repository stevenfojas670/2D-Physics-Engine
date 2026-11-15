import { describe, expect, test } from "vitest"
import { packEntity } from "@/ecs/Entity"
import {
	ContactManifolds,
	MAX_MANIFOLD_POINTS,
} from "@/resources/ContactManifolds"
import { PseudoVelocities } from "@/resources/PseudoVelocities"
import { createSleepSettings } from "@/resources/SleepSettings"
import { createSolverSettings } from "@/resources/SolverSettings"

const FIRST = packEntity(1, 0)
const SECOND = packEntity(2, 0)

function addWithFeatures(
	manifolds: ContactManifolds,
	entityA: number,
	entityB: number,
	features: number[],
): number {
	const manifold = manifolds.add(entityA, entityB)
	const columns = manifolds.columns
	columns.pointCount[manifold] = features.length
	features.forEach((feature, point) => {
		columns.featureId[manifold * MAX_MANIFOLD_POINTS + point] = feature
	})
	return manifold
}

describe("solver settings", () => {
	test("defaults match the spec", () => {
		expect(createSolverSettings()).toEqual({
			velocityIterations: 8,
			pseudoVelocityIterations: 3,
			beta: 0.2,
			slop: 0.5,
			restitutionThreshold: 20,
		})
	})
})

describe("sleep settings", () => {
	test("defaults match the spec", () => {
		expect(createSleepSettings()).toEqual({
			enabled: true,
			linearThreshold: 1,
			angularThreshold: 0.035,
			timeout: 0.5,
		})
	})
})

describe("contact manifolds", () => {
	test("growing past the initial capacity keeps every pair", () => {
		const manifolds = new ContactManifolds()
		manifolds.beginStep()
		for (let pair = 0; pair < 300; pair++) {
			manifolds.add(packEntity(pair, 0), packEntity(pair + 1000, 0))
		}
		expect(manifolds.count).toBe(300)
		for (let pair = 0; pair < 300; pair++) {
			expect(manifolds.columns.entityA[pair]).toBe(packEntity(pair, 0))
			expect(manifolds.columns.entityB[pair]).toBe(packEntity(pair + 1000, 0))
		}
	})

	test("a new manifold starts with zero impulses", () => {
		const manifolds = new ContactManifolds()
		manifolds.beginStep()
		const manifold = manifolds.add(FIRST, SECOND)
		const point = manifold * MAX_MANIFOLD_POINTS
		expect(manifolds.columns.normalImpulse[point]).toBe(0)
		expect(manifolds.columns.tangentImpulse[point]).toBe(0)
		expect(manifolds.columns.pseudoImpulse[point]).toBe(0)
	})

	test("impulses carry over by matching feature id", () => {
		const manifolds = new ContactManifolds()
		manifolds.beginStep()
		const previous = addWithFeatures(manifolds, FIRST, SECOND, [7, 9])
		const previousPoint = previous * MAX_MANIFOLD_POINTS
		manifolds.columns.normalImpulse[previousPoint] = 3
		manifolds.columns.tangentImpulse[previousPoint] = -1
		manifolds.columns.normalImpulse[previousPoint + 1] = 5
		manifolds.columns.pseudoImpulse[previousPoint] = 4
		manifolds.beginStep()
		const current = addWithFeatures(manifolds, FIRST, SECOND, [7, 8])
		manifolds.inheritImpulses(current)
		const point = current * MAX_MANIFOLD_POINTS
		expect(manifolds.columns.normalImpulse[point]).toBe(3)
		expect(manifolds.columns.tangentImpulse[point]).toBe(-1)
		expect(manifolds.columns.pseudoImpulse[point]).toBe(0)
		expect(manifolds.columns.normalImpulse[point + 1]).toBe(0)
	})

	test("a recycled entity inherits nothing", () => {
		const manifolds = new ContactManifolds()
		manifolds.beginStep()
		const previous = addWithFeatures(manifolds, FIRST, SECOND, [0])
		manifolds.columns.normalImpulse[previous * MAX_MANIFOLD_POINTS] = 3
		manifolds.beginStep()
		const current = addWithFeatures(manifolds, FIRST, packEntity(2, 1), [0])
		manifolds.inheritImpulses(current)
		expect(manifolds.columns.normalImpulse[current * MAX_MANIFOLD_POINTS]).toBe(
			0,
		)
	})

	test("a pair missing last step inherits nothing", () => {
		const manifolds = new ContactManifolds()
		manifolds.beginStep()
		manifolds.beginStep()
		const current = addWithFeatures(manifolds, FIRST, SECOND, [0])
		manifolds.inheritImpulses(current)
		expect(manifolds.columns.normalImpulse[current * MAX_MANIFOLD_POINTS]).toBe(
			0,
		)
	})
})

describe("pseudo-velocities", () => {
	test("capacity grows and clear zeroes every slot", () => {
		const pseudo = new PseudoVelocities()
		pseudo.ensureCapacity(100)
		expect(pseudo.x.length).toBeGreaterThanOrEqual(100)
		pseudo.x[99] = 1
		pseudo.y[50] = 2
		pseudo.angular[0] = 3
		pseudo.clear()
		expect(pseudo.x[99]).toBe(0)
		expect(pseudo.y[50]).toBe(0)
		expect(pseudo.angular[0]).toBe(0)
	})

	test("growing keeps existing values", () => {
		const pseudo = new PseudoVelocities()
		pseudo.ensureCapacity(4)
		pseudo.x[3] = 5
		pseudo.ensureCapacity(1000)
		expect(pseudo.x[3]).toBe(5)
	})
})
