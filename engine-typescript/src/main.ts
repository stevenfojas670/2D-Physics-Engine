import "@/style.css"

import { Controller } from "@/Controller"
import { World } from "@/ecs/World"
import {
	BENCHMARK_HEIGHT,
	BENCHMARK_WIDTH,
	buildBenchmarkScene,
} from "@/app/BenchmarkScene"
import { ControllerKeysResource } from "@/app/ControllerKeys"
import { buildDemoScene, resizeDemoWorld } from "@/app/DemoScene"
import type { DemoHandles } from "@/app/DemoScene"
import { FrameTimer } from "@/app/FrameTimer"
import { MouseInputResource, createMouseInput } from "@/app/MouseInput"
import {
	SANDBOX_HEIGHT,
	SANDBOX_WIDTH,
	buildSandboxScene,
	createSandboxRespawnSystem,
} from "@/app/SandboxScene"
import { selectScene } from "@/app/sceneSelection"
import { createRenderSchedule, createUpdateSchedule } from "@/app/schedules"
import {
	DebugOptionsResource,
	createDebugOptions,
} from "@/rendering/DebugOptions"
import { DrawBatches } from "@/rendering/DrawBatches"
import { RenderContextResource } from "@/rendering/RenderContext"

const BACKGROUND_COLOR = "rgb(240, 240, 240)"
const TEXT_COLOR = "black"
const TEXT_FONT = "12px Arial"
const CANVAS_SCALE = 0.75
const BENCHMARK_STEP = 1 / 60
const LEFT_BUTTON = 0

const canvas = document.getElementById("myCanvas") as HTMLCanvasElement
const ctx = canvas.getContext("2d")!
const scene = selectScene(location.search)
const isBenchmark = scene === "benchmark"

const world = new World()
const controller = new Controller(false)
const mouse = createMouseInput()
const render = { ctx, batches: new DrawBatches(), drawCalls: 0 }
world.setResource(ControllerKeysResource, controller.keys)
world.setResource(MouseInputResource, mouse)
world.setResource(RenderContextResource, render)
world.setResource(DebugOptionsResource, createDebugOptions())

let demoHandles: DemoHandles | null = null
if (scene === "benchmark") {
	canvas.width = BENCHMARK_WIDTH
	canvas.height = BENCHMARK_HEIGHT
	buildBenchmarkScene(world)
} else if (scene === "sandbox") {
	canvas.width = SANDBOX_WIDTH
	canvas.height = SANDBOX_HEIGHT
	buildSandboxScene(world)
} else {
	resizeCanvas()
	demoHandles = buildDemoScene(world, canvas.width, canvas.height)
}

const update = createUpdateSchedule(world)
if (scene === "sandbox") {
	update.add(createSandboxRespawnSystem(world))
}
const draw = createRenderSchedule(world)
const frameTimer = new FrameTimer()
let lastTime = performance.now()

document.addEventListener("DOMContentLoaded", () => {
	window.addEventListener("keydown", (event: KeyboardEvent) => {
		controller.keyboard(event.code, true)
	})

	window.addEventListener("keyup", (event: KeyboardEvent) => {
		controller.keyboard(event.code, false)
	})

	canvas.addEventListener("mousemove", (event: MouseEvent) => {
		const bounds = canvas.getBoundingClientRect()
		mouse.x = event.clientX - bounds.left
		mouse.y = event.clientY - bounds.top
	})

	window.addEventListener("mousedown", (event: MouseEvent) => {
		if (event.button === LEFT_BUTTON) {
			mouse.leftDown = true
		}
	})

	window.addEventListener("mouseup", (event: MouseEvent) => {
		if (event.button === LEFT_BUTTON) {
			mouse.leftDown = false
		}
	})

	window.addEventListener("resize", () => {
		if (demoHandles === null) {
			return
		}
		resizeCanvas()
		resizeDemoWorld(world, demoHandles, canvas.width, canvas.height)
	})
})

mainLoop()

function mainLoop(): void {
	window.requestAnimationFrame(mainLoop)
	const currentTime = performance.now()
	const deltaTime = (currentTime - lastTime) / 1000
	lastTime = currentTime
	runFrame(deltaTime)
}

function runFrame(deltaTime: number): void {
	clear()
	drawText(`${Math.round(1.0 / deltaTime)} FPS`, 20)

	const updateStart = performance.now()
	update.run(world, isBenchmark ? BENCHMARK_STEP : deltaTime)
	const renderStart = performance.now()
	draw.run(world, deltaTime)
	const renderEnd = performance.now()

	if (isBenchmark) {
		frameTimer.record(
			renderStart - updateStart,
			renderEnd - renderStart,
			render.drawCalls,
		)
		drawText(benchmarkText(), 40)
	}
}

function benchmarkText(): string {
	const summary = frameTimer.summary
	if (summary === null) {
		return "measuring..."
	}
	return `update ${summary.updateMs.toFixed(2)} ms · render ${summary.renderMs.toFixed(2)} ms · ${summary.drawCalls.toFixed(0)} draw calls`
}

function drawText(text: string, y: number): void {
	ctx.font = TEXT_FONT
	ctx.fillStyle = TEXT_COLOR
	ctx.fillText(text, 10, y)
}

function clear(): void {
	ctx.fillStyle = BACKGROUND_COLOR
	ctx.fillRect(0, 0, canvas.width, canvas.height)
}

function resizeCanvas(): void {
	canvas.width = Math.max(1, Math.floor(window.innerWidth * CANVAS_SCALE))
	canvas.height = Math.max(1, Math.floor(window.innerHeight * CANVAS_SCALE))
}
