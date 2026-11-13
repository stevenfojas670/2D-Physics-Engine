import { describe, expect, test } from "vitest"
import { World } from "@/ecs/World"
import { Schedule } from "@/ecs/Schedule"
import { Collider } from "@/components/Collider"
import { spawnRigidBody, spawnStaticBody } from "@/components/bodyFactories"
import { ContactLog, ContactsResource } from "@/resources/ContactLog"
import {
	createCircleShape,
	createRectangleShape,
} from "@/shapes/colliderShapes"
import { createColliderRenderSystem } from "@/rendering/ColliderRenderSystem"
import { createDebugDrawSystem } from "@/rendering/DebugDrawSystem"
import {
	DebugOptionsResource,
	createDebugOptions,
} from "@/rendering/DebugOptions"
import { DrawBatches } from "@/rendering/DrawBatches"
import type { BatchCanvas } from "@/rendering/DrawBatches"
import { createDrawFlushSystem } from "@/rendering/DrawFlushSystem"
import { createJointRenderSystem } from "@/rendering/JointRenderSystem"
import { RenderContextResource } from "@/rendering/RenderContext"

interface CallCounts {
	beginPath: number
	stroke: number
	fill: number
	moveTo: number
	lineTo: number
	arc: number
}

interface FakeCanvas extends BatchCanvas {
	readonly calls: CallCounts
	readonly strokeColors: string[]
}

function fakeCanvas(): FakeCanvas {
	const calls: CallCounts = {
		beginPath: 0,
		stroke: 0,
		fill: 0,
		moveTo: 0,
		lineTo: 0,
		arc: 0,
	}
	const strokeColors: string[] = []
	return {
		calls,
		strokeColors,
		strokeStyle: "",
		fillStyle: "",
		beginPath: () => {
			calls.beginPath++
		},
		stroke() {
			calls.stroke++
			strokeColors.push(String(this.strokeStyle))
		},
		fill: () => {
			calls.fill++
		},
		moveTo: () => {
			calls.moveTo++
		},
		lineTo: () => {
			calls.lineTo++
		},
		arc: () => {
			calls.arc++
		},
	}
}

function renderWorld(canvas: FakeCanvas): World {
	const world = new World()
	world.setResource(RenderContextResource, {
		ctx: canvas,
		batches: new DrawBatches(),
		drawCalls: 0,
	})
	world.setResource(DebugOptionsResource, createDebugOptions())
	world.setResource(ContactsResource, new ContactLog())
	return world
}

function renderSchedule(world: World): Schedule {
	return new Schedule()
		.add(createColliderRenderSystem(world))
		.add(createJointRenderSystem(world))
		.add(createDebugDrawSystem(world))
		.add(createDrawFlushSystem(world))
}

describe("draw batches", () => {
	test("flush issues one draw call per colour and kind", () => {
		const batches = new DrawBatches()
		const canvas = fakeCanvas()
		for (let index = 0; index < 100; index++) {
			batches.line(0, index, 10, index, "black")
		}
		for (let index = 0; index < 50; index++) {
			batches.line(index, 0, index, 10, "red")
		}
		for (let index = 0; index < 10; index++) {
			batches.fillCircle(index, index, 5, "green")
		}
		expect(batches.flush(canvas)).toBe(3)
		expect(canvas.calls.beginPath).toBe(3)
		expect(canvas.calls.stroke).toBe(2)
		expect(canvas.calls.fill).toBe(1)
		expect(canvas.calls.lineTo).toBe(150)
	})

	test("clear resets batches without new draw calls", () => {
		const batches = new DrawBatches()
		batches.line(0, 0, 1, 1, "black")
		batches.strokeCircle(0, 0, 5, "black")
		batches.clear()
		const canvas = fakeCanvas()
		expect(batches.flush(canvas)).toBe(0)
		expect(canvas.calls.beginPath).toBe(0)
	})

	test("circles start a new subpath", () => {
		const batches = new DrawBatches()
		batches.strokeCircle(0, 0, 5, "black")
		batches.strokeCircle(20, 0, 5, "black")
		const canvas = fakeCanvas()
		expect(batches.flush(canvas)).toBe(1)
		expect(canvas.calls.moveTo).toBe(2)
		expect(canvas.calls.arc).toBe(2)
	})

	test("an arrow is a shaft plus two head lines", () => {
		const batches = new DrawBatches()
		batches.arrow(0, 0, 40, 0, "blue")
		const canvas = fakeCanvas()
		batches.flush(canvas)
		expect(canvas.calls.lineTo).toBe(3)
	})
})

describe("render systems", () => {
	test("render systems batch a 2,000-body scene into a handful of calls", () => {
		const canvas = fakeCanvas()
		const world = renderWorld(canvas)
		for (let index = 0; index < 2000; index++) {
			const x = (index % 50) * 30
			const y = Math.floor(index / 50) * 30
			const shape =
				index % 2 === 0 ? createCircleShape(6) : createRectangleShape(12, 12)
			spawnRigidBody(world, shape, x, y, 1)
		}
		renderSchedule(world).run(world, 1 / 60)
		const drawCalls = world.resource(RenderContextResource).drawCalls
		expect(drawCalls).toBeGreaterThan(0)
		expect(drawCalls).toBeLessThan(15)
	})

	test("debug options turn layers off", () => {
		const canvas = fakeCanvas()
		const world = renderWorld(canvas)
		const body = spawnStaticBody(world, createRectangleShape(20, 20), 50, 50)
		const colliders = world.store(Collider)
		colliders.columns.touching[colliders.slotOf(body)] = 1
		const schedule = renderSchedule(world)
		schedule.run(world, 1 / 60)
		expect(canvas.strokeColors).toContain("red")
		const linesWithDebug = canvas.calls.lineTo

		const options = world.resource(DebugOptionsResource)
		options.normals = false
		options.boundingBoxes = false
		options.friction = false
		options.mouseDrag = false
		const quietCanvas = fakeCanvas()
		world.resource(RenderContextResource).ctx = quietCanvas
		schedule.run(world, 1 / 60)
		expect(quietCanvas.strokeColors).not.toContain("red")
		expect(quietCanvas.calls.lineTo).toBe(4)
		expect(linesWithDebug).toBeGreaterThan(quietCanvas.calls.lineTo)
	})

	test("untouched bounding boxes are gray", () => {
		const canvas = fakeCanvas()
		const world = renderWorld(canvas)
		spawnStaticBody(world, createRectangleShape(20, 20), 50, 50)
		renderSchedule(world).run(world, 1 / 60)
		expect(canvas.strokeColors).toContain("gray")
		expect(canvas.strokeColors).not.toContain("red")
	})
})
