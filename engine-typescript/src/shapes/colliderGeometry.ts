import { ref } from "@/ecs/defineComponent"
import type { Columns } from "@/ecs/defineComponent"
import { ColliderKind } from "./colliderShapes"

const COLLIDER_SCHEMA = {
	kind: "u8",
	radius: "f64",
	localVertices: ref<Float64Array>(),
	worldVertices: ref<Float64Array>(),
	worldNormals: ref<Float64Array>(),
	minX: "f64",
	minY: "f64",
	maxX: "f64",
	maxY: "f64",
	touching: "u8",
} as const

type ColliderSchema = typeof COLLIDER_SCHEMA

type ColliderColumns = Columns<ColliderSchema>

function transformCollider(
	colliders: ColliderColumns,
	slot: number,
	x: number,
	y: number,
	angle: number,
	angleChanged: boolean,
): void {
	if (colliders.kind[slot] === ColliderKind.CIRCLE) {
		const radius = colliders.radius[slot]
		colliders.minX[slot] = x - radius
		colliders.minY[slot] = y - radius
		colliders.maxX[slot] = x + radius
		colliders.maxY[slot] = y + radius
		return
	}

	const local = colliders.localVertices[slot]!
	const world = colliders.worldVertices[slot]!
	const cos = Math.cos(angle)
	const sin = Math.sin(angle)
	let minX = Number.POSITIVE_INFINITY
	let minY = Number.POSITIVE_INFINITY
	let maxX = Number.NEGATIVE_INFINITY
	let maxY = Number.NEGATIVE_INFINITY

	for (let offset = 0; offset < local.length; offset += 2) {
		const localX = local[offset]
		const localY = local[offset + 1]
		const worldX = localX * cos - localY * sin + x
		const worldY = localX * sin + localY * cos + y
		world[offset] = worldX
		world[offset + 1] = worldY
		if (worldX < minX) minX = worldX
		if (worldY < minY) minY = worldY
		if (worldX > maxX) maxX = worldX
		if (worldY > maxY) maxY = worldY
	}

	colliders.minX[slot] = minX
	colliders.minY[slot] = minY
	colliders.maxX[slot] = maxX
	colliders.maxY[slot] = maxY

	if (angleChanged) {
		computeNormals(world, colliders.worldNormals[slot]!)
	}
}

function computeNormals(vertices: Float64Array, normals: Float64Array): void {
	const length = vertices.length
	for (let offset = 0; offset < length; offset += 2) {
		const nextOffset = (offset + 2) % length
		let directionX = vertices[nextOffset] - vertices[offset]
		let directionY = vertices[nextOffset + 1] - vertices[offset + 1]
		const directionLength = Math.hypot(directionX, directionY)
		if (directionLength > 0) {
			directionX /= directionLength
			directionY /= directionLength
		}
		normals[offset] = directionY
		normals[offset + 1] = -directionX
	}
}

function translateCollider(
	colliders: ColliderColumns,
	slot: number,
	deltaX: number,
	deltaY: number,
): void {
	const world = colliders.worldVertices[slot]
	if (world !== undefined) {
		for (let offset = 0; offset < world.length; offset += 2) {
			world[offset] += deltaX
			world[offset + 1] += deltaY
		}
	}
	colliders.minX[slot] += deltaX
	colliders.maxX[slot] += deltaX
	colliders.minY[slot] += deltaY
	colliders.maxY[slot] += deltaY
}

function isPointInsideCollider(
	colliders: ColliderColumns,
	slot: number,
	centerX: number,
	centerY: number,
	pointX: number,
	pointY: number,
): boolean {
	if (colliders.kind[slot] === ColliderKind.CIRCLE) {
		const radius = colliders.radius[slot]
		const offsetX = centerX - pointX
		const offsetY = centerY - pointY
		return radius * radius > offsetX * offsetX + offsetY * offsetY
	}

	const vertices = colliders.worldVertices[slot]!
	const normals = colliders.worldNormals[slot]!
	let isInside = false
	for (let offset = 0; offset < vertices.length; offset += 2) {
		const toPointX = pointX - vertices[offset]
		const toPointY = pointY - vertices[offset + 1]
		if (toPointX * normals[offset] + toPointY * normals[offset + 1] > 0) {
			return false
		}
		isInside = true
	}
	return isInside
}

function aabbOverlap(
	colliders: ColliderColumns,
	slotA: number,
	slotB: number,
): boolean {
	const overlapX =
		colliders.maxX[slotB] > colliders.minX[slotA] &&
		colliders.minX[slotB] < colliders.maxX[slotA]
	const overlapY =
		colliders.minY[slotB] < colliders.maxY[slotA] &&
		colliders.maxY[slotB] > colliders.minY[slotA]
	return overlapX && overlapY
}

export type { ColliderSchema, ColliderColumns }
export {
	COLLIDER_SCHEMA,
	transformCollider,
	computeNormals,
	translateCollider,
	isPointInsideCollider,
	aabbOverlap,
}
