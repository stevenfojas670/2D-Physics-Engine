import { Vector2, add, subtract, scale } from "@/Vector2"
import { Shape } from "./Shape"
import { MathHelper } from "@/utils/MathHelper"
import { DrawUtils } from "@/utils/DrawUtils"

class Polygon extends Shape {
	constructor(vertices: Array<Vector2>) {
		super(vertices)
		this.centroid = MathHelper.calcCentroid(vertices)

		this.normals = MathHelper.calcNormals(vertices)

		this.setCentroid(this.centroid)
		this.calculateBoundingBox()
	}

	calculateInertia(mass: number): number {
		let inertia = 0
		const massPerTriangleFace = mass / this.vertices.length

		for (let i = 0; i < this.vertices.length; i++) {
			const centerToVertice0 = subtract(this.vertices[i], this.centroid)
			const indexVertice1 = MathHelper.wrapIndex(i + 1, this.vertices.length)
			const centerToVertice1 = subtract(
				this.vertices[indexVertice1],
				this.centroid,
			)
			const inertiaTriangle =
				(massPerTriangleFace *
					(centerToVertice0.lengthSquared() +
						centerToVertice1.lengthSquared() +
						centerToVertice0.dot(centerToVertice1))) /
				6
			inertia += inertiaTriangle
		}

		return inertia
	}

	rotate(radiansDelta: number): void {
		super.rotate(radiansDelta)
		this.normals = MathHelper.calcNormals(this.vertices)
	}

	draw(ctx: CanvasRenderingContext2D): void {
		super.draw(ctx)
		DrawUtils.drawPoint(this.centroid, 5, "black")

		for (let i = 0; i < this.vertices.length; i++) {
			const direction = subtract(
				this.vertices[MathHelper.wrapIndex(i + 1, this.vertices.length)],
				this.vertices[i],
			)
			const center = add(this.vertices[i], scale(direction, 0.5))

			DrawUtils.drawLine(
				center,
				add(center, scale(this.normals[i], 15)),
				"black",
			)
		}
	}
}

export { Polygon }
