import { describe, expect, test } from "vitest"
import { World } from "@/ecs/World"
import { Velocity } from "@/components/Velocity"
import {
	prepareContacts,
	recordFrictionArrows,
	solvePseudoVelocities,
	solveVelocities,
	warmStart,
} from "@/collisionDetectionSystem/sequentialImpulse"
import { ContactLog } from "@/resources/ContactLog"
import {
	ContactManifolds,
	MAX_MANIFOLD_POINTS,
} from "@/resources/ContactManifolds"
import { PseudoVelocities } from "@/resources/PseudoVelocities"
import { createSolverSettings } from "@/resources/SolverSettings"

const STEP = 1 / 60
const PASSES = 8

interface BodySetup {
	velocityX: number
	velocityY: number
	inverseMass: number
	movable: boolean
}

interface PairSetup {
	bodyA: BodySetup
	bodyB: BodySetup
	normalX: number
	normalY: number
	depth: number
	restitution: number
	friction: number
}

function body(
	velocityX: number,
	velocityY: number,
	inverseMass = 1,
	movable = true,
): BodySetup {
	return { velocityX, velocityY, inverseMass, movable }
}

function pair(overrides: Partial<PairSetup>): PairSetup {
	return {
		bodyA: body(0, 0),
		bodyB: body(0, 0),
		normalX: 1,
		normalY: 0,
		depth: 0,
		restitution: 0,
		friction: 0,
		...overrides,
	}
}

function solverWorld(setup: PairSetup) {
	const world = new World()
	const entityA = world.createEntity()
	const entityB = world.createEntity()
	world.add(entityA, Velocity, {
		x: setup.bodyA.velocityX,
		y: setup.bodyA.velocityY,
	})
	world.add(entityB, Velocity, {
		x: setup.bodyB.velocityX,
		y: setup.bodyB.velocityY,
	})
	const velocities = world.store(Velocity)
	const manifolds = new ContactManifolds()
	manifolds.beginStep()
	const manifold = manifolds.add(entityA, entityB)
	const columns = manifolds.columns
	columns.velocitySlotA[manifold] = setup.bodyA.movable
		? velocities.slotOf(entityA)
		: -1
	columns.velocitySlotB[manifold] = setup.bodyB.movable
		? velocities.slotOf(entityB)
		: -1
	columns.inverseMassA[manifold] = setup.bodyA.movable
		? setup.bodyA.inverseMass
		: 0
	columns.inverseMassB[manifold] = setup.bodyB.movable
		? setup.bodyB.inverseMass
		: 0
	columns.normalX[manifold] = setup.normalX
	columns.normalY[manifold] = setup.normalY
	columns.restitution[manifold] = setup.restitution
	columns.friction[manifold] = setup.friction
	columns.pointCount[manifold] = 1
	const point = manifold * MAX_MANIFOLD_POINTS
	columns.depth[point] = setup.depth
	const velocityOf = (index: 0 | 1): [number, number] => {
		const slot = velocities.slotOf(index === 0 ? entityA : entityB)
		return [velocities.columns.x[slot], velocities.columns.y[slot]]
	}
	return { manifolds, velocities: velocities.columns, velocityOf, point }
}

type SolverSetup = ReturnType<typeof solverWorld>

function solve(setup: SolverSetup, threshold = 1): void {
	const settings = {
		...createSolverSettings(),
		restitutionThreshold: threshold,
	}
	prepareContacts(setup.manifolds, setup.velocities, settings)
	warmStart(setup.manifolds, setup.velocities)
	for (let pass = 0; pass < PASSES; pass++) {
		solveVelocities(setup.manifolds, setup.velocities)
	}
}

function slideOnFloor(velocityX: number): SolverSetup {
	const setup = solverWorld(
		pair({
			bodyA: body(0, 0, 0, false),
			bodyB: body(velocityX, 0),
			normalX: 0,
			normalY: -1,
			friction: 0.5,
		}),
	)
	prepareContacts(setup.manifolds, setup.velocities, createSolverSettings())
	setup.manifolds.columns.normalImpulse[setup.point] = 1
	return setup
}

describe("sequential impulses", () => {
	test("head-on circles bounce with restitution 0.5", () => {
		const setup = solverWorld(
			pair({ bodyA: body(10, 0), bodyB: body(-10, 0), restitution: 0.5 }),
		)
		solve(setup)
		expect(setup.velocityOf(0)[0]).toBeCloseTo(-5, 9)
		expect(setup.velocityOf(1)[0]).toBeCloseTo(5, 9)
	})

	test("restitution 0 stops the approach without NaN", () => {
		const setup = solverWorld(
			pair({ bodyA: body(10, 0), bodyB: body(-10, 0), restitution: 0 }),
		)
		solve(setup)
		const [velocityAX] = setup.velocityOf(0)
		const [velocityBX] = setup.velocityOf(1)
		expect(Number.isNaN(velocityAX)).toBe(false)
		expect(velocityBX - velocityAX).toBeCloseTo(0, 9)
	})

	test("a closing speed under the threshold does not bounce", () => {
		const setup = solverWorld(
			pair({ bodyA: body(5, 0), bodyB: body(-5, 0), restitution: 1 }),
		)
		solve(setup, 20)
		expect(setup.velocityOf(1)[0] - setup.velocityOf(0)[0]).toBeCloseTo(0, 9)
	})

	test("separating bodies are left alone", () => {
		const setup = solverWorld(
			pair({ bodyA: body(-10, 0), bodyB: body(10, 0), restitution: 0.5 }),
		)
		solve(setup)
		expect(setup.velocityOf(0)).toEqual([-10, 0])
		expect(setup.velocityOf(1)).toEqual([10, 0])
		expect(setup.manifolds.columns.normalImpulse[setup.point]).toBe(0)
	})

	test("friction is capped at mu times the normal impulse", () => {
		const setup = slideOnFloor(10)
		for (let pass = 0; pass < PASSES; pass++) {
			solveVelocities(setup.manifolds, setup.velocities)
			expect(
				Math.abs(setup.manifolds.columns.tangentImpulse[setup.point]),
			).toBeLessThanOrEqual(0.5 + 1e-12)
		}
		expect(setup.velocityOf(1)[0]).toBeCloseTo(9.5, 9)
	})

	test("friction slows a body sliding the other way the same amount", () => {
		const setup = slideOnFloor(-10)
		for (let pass = 0; pass < PASSES; pass++) {
			solveVelocities(setup.manifolds, setup.velocities)
		}
		expect(setup.velocityOf(1)[0]).toBeCloseTo(-9.5, 9)
	})

	test("warm starting applies the carried impulses", () => {
		const setup = slideOnFloor(0)
		setup.manifolds.columns.normalImpulse[setup.point] = 2
		warmStart(setup.manifolds, setup.velocities)
		expect(setup.velocityOf(1)[1]).toBeCloseTo(-2, 9)
	})

	test("an immovable side is never written", () => {
		const setup = solverWorld(
			pair({
				bodyA: body(3, 4, 0, false),
				bodyB: body(10, 5),
				normalX: 0,
				normalY: -1,
				friction: 0.5,
				restitution: 0.5,
			}),
		)
		solve(setup)
		expect(setup.velocityOf(0)).toEqual([3, 4])
	})

	test("friction arrows point along the friction on body B", () => {
		const setup = slideOnFloor(10)
		const columns = setup.manifolds.columns
		columns.pointX[setup.point] = 5
		columns.pointY[setup.point] = 7
		solveVelocities(setup.manifolds, setup.velocities)
		const log = new ContactLog()
		recordFrictionArrows(setup.manifolds, log)
		expect(log.frictionCount).toBe(1)
		expect(log.frictionArrows.slice(0, 4)).toEqual([5, 7, -35, 7])
	})
})

describe("split impulses", () => {
	function pushedOutOfFloor(depth: number) {
		const setup = solverWorld(
			pair({
				bodyA: body(0, 0, 0, false),
				bodyB: body(0, 0),
				normalX: 0,
				normalY: -1,
				depth,
			}),
		)
		const pseudo = new PseudoVelocities()
		pseudo.ensureCapacity(2)
		const settings = createSolverSettings()
		prepareContacts(setup.manifolds, setup.velocities, settings)
		for (let pass = 0; pass < 3; pass++) {
			solvePseudoVelocities(setup.manifolds, pseudo, settings, STEP)
		}
		return { setup, pseudo }
	}

	test("pseudo-velocities push bodies apart without touching real velocity", () => {
		const { setup, pseudo } = pushedOutOfFloor(3)
		const slotB = setup.manifolds.columns.velocitySlotB[0]
		expect(pseudo.y[slotB]).toBeCloseTo((-0.2 * 2.5) / STEP, 9)
		expect(setup.velocityOf(1)).toEqual([0, 0])
		expect(
			setup.manifolds.columns.pseudoImpulse[setup.point],
		).toBeGreaterThanOrEqual(0)
	})

	test("overlap within the slop needs no push", () => {
		const { setup, pseudo } = pushedOutOfFloor(0.4)
		expect(pseudo.y[setup.manifolds.columns.velocitySlotB[0]]).toBe(0)
	})
})

describe("block solver", () => {
	test("a box resting flat splits its weight evenly in one pass", () => {
		const world = new World()
		const floor = world.createEntity()
		const box = world.createEntity()
		const step = 1 / 60
		const fallSpeed = 200 * step
		world.add(box, Velocity, { x: 0, y: fallSpeed, angular: 0 })
		const velocities = world.store(Velocity)
		const manifolds = new ContactManifolds()
		manifolds.beginStep()
		const manifold = manifolds.add(floor, box)
		const columns = manifolds.columns
		columns.velocitySlotA[manifold] = -1
		columns.velocitySlotB[manifold] = velocities.slotOf(box)
		columns.inverseMassB[manifold] = 1
		columns.inverseInertiaB[manifold] = 12 / (20 * 20 + 20 * 20)
		columns.normalX[manifold] = 0
		columns.normalY[manifold] = -1
		columns.pointCount[manifold] = 2
		const first = manifold * MAX_MANIFOLD_POINTS
		columns.anchorBX[first] = -10
		columns.anchorBY[first] = 10
		columns.anchorBX[first + 1] = 10
		columns.anchorBY[first + 1] = 10
		prepareContacts(manifolds, velocities.columns, createSolverSettings())
		solveVelocities(manifolds, velocities.columns)
		const half = fallSpeed / 2
		expect(columns.normalImpulse[first]).toBeCloseTo(half, 9)
		expect(columns.normalImpulse[first + 1]).toBeCloseTo(half, 9)
		const slot = velocities.slotOf(box)
		expect(velocities.columns.y[slot]).toBeCloseTo(0, 9)
		expect(velocities.columns.angular[slot]).toBeCloseTo(0, 9)
	})
})
