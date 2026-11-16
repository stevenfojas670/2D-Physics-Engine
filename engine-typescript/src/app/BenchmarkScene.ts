import type { World } from "@/ecs/World"
import { spawnRigidBody } from "@/components/bodyFactories"
import { createRectangleShape } from "@/shapes/colliderShapes"
import type { ColliderShape } from "@/shapes/colliderShapes"
import { installWorldResources, spawnWalls } from "./DemoScene"
import type { BenchmarkLayout } from "./sceneSelection"

const BENCHMARK_WIDTH = 1600
const BENCHMARK_HEIGHT = 1000
const DEFAULT_BODY_COUNT = 2000
const PYRAMID_CENTER_X = 800
const PYRAMID_TOP_Y = 60
const BODY_SPACING = 14
const HALF_BODY_SPACING = 7
const BOX_SIZE = 12
const STANDING_PYRAMID_BODIES = 210
const CRATE_SIZE = 30
const CRATE_SPACING = 31
const BODY_MASS = 1
const BENCHMARK_SETTLED_WARMUP_FRAMES = 1800

function buildBenchmarkScene(
	world: World,
	bodyCount = DEFAULT_BODY_COUNT,
	layout: BenchmarkLayout = "falling",
): void {
	installWorldResources(world, BENCHMARK_WIDTH, BENCHMARK_HEIGHT)
	spawnWalls(world, BENCHMARK_WIDTH, BENCHMARK_HEIGHT)
	if (layout === "standing") {
		const crate = createRectangleShape(CRATE_SIZE, CRATE_SIZE)
		spawnStandingPyramid(world, crate, bodyCount)
	} else {
		const box = createRectangleShape(BOX_SIZE, BOX_SIZE)
		spawnFallingPyramid(world, box, bodyCount)
	}
}

function spawnFallingPyramid(
	world: World,
	box: ColliderShape,
	bodyCount: number,
): void {
	let spawned = 0
	for (let row = 0; spawned < bodyCount; row++) {
		for (let column = 0; column <= row && spawned < bodyCount; column++) {
			const x =
				PYRAMID_CENTER_X - row * HALF_BODY_SPACING + column * BODY_SPACING
			const y = PYRAMID_TOP_Y + row * BODY_SPACING
			spawnRigidBody(world, box, x, y, BODY_MASS)
			spawned++
		}
	}
}

function standingBaseWidth(bodyCount: number): number {
	let width = 0
	while ((width * (width + 1)) / 2 < bodyCount) {
		width++
	}
	return width
}

function spawnStandingPyramid(
	world: World,
	crate: ColliderShape,
	bodyCount: number,
): void {
	const baseWidth = standingBaseWidth(bodyCount)
	const bottomY = BENCHMARK_HEIGHT - CRATE_SIZE / 2
	let spawned = 0
	for (let level = 0; spawned < bodyCount; level++) {
		const rowWidth = baseWidth - level
		const leftX = PYRAMID_CENTER_X - ((rowWidth - 1) * CRATE_SPACING) / 2
		const y = bottomY - level * CRATE_SIZE
		for (let column = 0; column < rowWidth && spawned < bodyCount; column++) {
			spawnRigidBody(world, crate, leftX + column * CRATE_SPACING, y, BODY_MASS)
			spawned++
		}
	}
}

export {
	BENCHMARK_WIDTH,
	BENCHMARK_HEIGHT,
	BENCHMARK_SETTLED_WARMUP_FRAMES,
	STANDING_PYRAMID_BODIES,
	buildBenchmarkScene,
}
