import { Vector2, subtract, add } from "@/Vector2"
import { BoundingBox } from "@/optimizations/boundingVolumes/BoundingBox"
import { BoundingVolume } from "@/optimizations/boundingVolumes/BoundingVolume"
import { DrawUtils } from "@/utils/DrawUtils"
import { MathHelper } from "@/utils/MathHelper"

abstract class Shape {
	protected vertices: Array<Vector2>
	protected color: string
	protected normals: Array<Vector2>
	protected centroid: Vector2

	private boundingVolume: BoundingVolume
	private anchorPoints: Map<number, Vector2>

	constructor(vertices: Array<Vector2>) {
		this.vertices = vertices
		this.color = "black"
		this.boundingVolume = new BoundingBox()
		this.anchorPoints = new Map()
		this.normals = []
		this.centroid = new Vector2(0, 0)

		if (new.target === Shape) {
			throw new TypeError(
				"Cannot construct abstract instances of class 'Shape'.",
			)
		}
	}

	get boundingBox(): BoundingBox {
		return this.boundingVolume as BoundingBox
	}

	getAnchorPos(id: number): Vector2 {
		return this.anchorPoints.get(id)!
	}

	getNormals(): Vector2[] {
		return this.normals
	}

	getVertices(): Vector2[] {
		return this.vertices
	}

	setColor(color: string): void {
		this.color = color
	}

	setCentroid(position: Vector2): void {
		this.centroid = position
	}

	getCentroid(): Vector2 {
		return this.centroid!
	}

	createAnchorPoint(localAnchorPos: Vector2): number {
		this.anchorPoints.set(
			this.anchorPoints.size,
			add(this.centroid, localAnchorPos),
		)
		const id = this.anchorPoints.size - 1
		console.log(`Created anchor with id [${id}]`)
		return id
	}

	removeAnchor(anchorIndex: number): boolean {
		const removed = this.anchorPoints.delete(anchorIndex)
		if (!removed) {
			console.log(`Anchor with id [${anchorIndex}] not found!`)
		}
		return removed
	}

	isPointInside(pos: Vector2): boolean {
		let isInside = false
		for (let i = 0; i < this.vertices.length; i++) {
			const vertex = this.vertices[i]
			const normal = this.normals[i]
			const vertToPoint = subtract(pos, vertex)
			const dot = vertToPoint.dot(normal)
			if (dot > 0) {
				return false
			} else {
				isInside = true
			}
		}

		return isInside
	}

	calculateBoundingBox(): void {
		const topLeft = new Vector2(Number.MAX_VALUE, Number.MAX_VALUE)
		const bottomRight = new Vector2(-Number.MAX_VALUE, -Number.MAX_VALUE)

		for (let i = 0; i < this.vertices.length; i++) {
			const [x, y] = [this.vertices[i].x, this.vertices[i].y]

			if (x < topLeft.x) topLeft.x = x
			if (y < topLeft.y) topLeft.y = y
			if (x > bottomRight.x) bottomRight.x = x
			if (y > bottomRight.y) bottomRight.y = y
		}

		this.boundingBox.topLeft = topLeft
		this.boundingBox.bottomRight = bottomRight
	}

	calculateConvexHull() {}

	calculateEightDOP() {}

	calculateOBB() {}

	abstract calculateInertia(mass: number): number

	draw(ctx: CanvasRenderingContext2D): void {
		for (let i = 1; i < this.vertices.length; i++) {
			DrawUtils.drawLine(this.vertices[i - 1], this.vertices[i], this.color)
		}
		DrawUtils.drawLine(
			this.vertices[this.vertices.length - 1],
			this.vertices[0],
			this.color,
		)

		for (const [, value] of this.anchorPoints.entries()) {
			DrawUtils.drawPoint(value, 5, "green")
		}

		DrawUtils.drawPoint(this.centroid, 5, this.color)
		this.boundingBox.draw(ctx)
	}

	move(delta: Vector2): void {
		for (let i = 0; i < this.vertices.length; i++) {
			this.vertices[i].add(delta)
		}
		this.centroid.add(delta)

		this.boundingBox.topLeft.add(delta)
		this.boundingBox.bottomRight.add(delta)

		for (const [key, anchorPos] of this.anchorPoints.entries()) {
			this.anchorPoints.set(key, add(anchorPos, delta))
		}
	}

	rotate(radiansDelta: number): void {
		for (let i = 0; i < this.vertices.length; i++) {
			const rotatedVertices = MathHelper.rotateAroundPoint(
				this.vertices[i],
				this.centroid,
				radiansDelta,
			)
			this.vertices[i] = rotatedVertices
		}

		this.calculateBoundingBox()

		for (const [key, anchorPos] of this.anchorPoints.entries()) {
			const rotated = MathHelper.rotateAroundPoint(
				anchorPos,
				this.centroid,
				radiansDelta,
			)
			this.anchorPoints.set(key, rotated)
		}
	}
}

export { Shape }
