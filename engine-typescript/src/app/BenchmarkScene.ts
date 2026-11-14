import type { World } from "@/ecs/World"
import { spawnRigidBody } from "@/components/bodyFactories"
import {
	createCircleShape,
	createRectangleShape,
} from "@/shapes/colliderShapes"
import { installWorldResources, spawnWalls } from "./DemoScene"

const BENCHMARK_WIDTH = 1600
const BENCHMARK_HEIGHT = 1000
const DEFAULT_BODY_COUNT = 2000
const PYRAMID_CENTER_X = 800
const PYRAMID_TOP_Y = 60
const BODY_SPACING = 14
const HALF_BODY_SPACING = 7
const CIRCLE_RADIUS = 6
const BOX_SIZE = 12
const BODY_MASS = 1

function buildBenchmarkScene(
	world: World,
	bodyCount = DEFAULT_BODY_COUNT,
): void {
	installWorldResources(world, BENCHMARK_WIDTH, BENCHMARK_HEIGHT)
	spawnWalls(world, BENCHMARK_WIDTH, BENCHMARK_HEIGHT)
	const circle = createCircleShape(CIRCLE_RADIUS)
	const box = createRectangleShape(BOX_SIZE, BOX_SIZE)
	let spawned = 0
	for (let row = 0; spawned < bodyCount; row++) {
		for (let column = 0; column <= row && spawned < bodyCount; column++) {
			const x =
				PYRAMID_CENTER_X - row * HALF_BODY_SPACING + column * BODY_SPACING
			const y = PYRAMID_TOP_Y + row * BODY_SPACING
			const shape = (row + column) % 2 === 0 ? circle : box
			spawnRigidBody(world, shape, x, y, BODY_MASS)
			spawned++
		}
	}
}

export { BENCHMARK_WIDTH, BENCHMARK_HEIGHT, buildBenchmarkScene }
