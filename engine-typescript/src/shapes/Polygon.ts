import { Vector2, Add, Sub, Scale } from "@/Vector2"
import { Shape } from "./Shape"
import MathHelper from "@/utils/MathHelpers"
import { DrawUtils } from "@/utils/DrawUtils"

/**
 * Represents a convex polygon shape with computed centroid and edge normals.
 *
 * A polygon is defined by its vertices and uses the base {@link Shape}
 * functionality for shared transform behavior.
 */
class Polygon extends Shape {
	/**
	 * Creates a new polygon from the provided vertices.
	 *
	 * @param vertices - The ordered list of polygon vertices.
	 */
	constructor(vertices: Array<Vector2>) {
		super(vertices)
		/** The polygon's centroid in local coordinates. */
		this.centroid = MathHelper.calcCentroid(vertices)

		/** Normal vectors for each polygon edge, used for collision and drawing. */
		this.normals = MathHelper.calcNormals(vertices)

		this.setCentroid(this.centroid)
		this.calculateBoundingBox()
	}

	/**
	 * Calculates the polygon's moment of inertia around its centroid.
	 *
	 * The inertia is approximated by subdividing the polygon into triangles
	 * formed by sequential vertices and the centroid.
	 *
	 * @param mass - The mass of the polygon.
	 * @returns The scalar moment of inertia.
	 */
	calculateInertia(mass: number): number {
		let inertia = 0
		let massPerTriangleFace = mass / this.vertices.length

		for (let i = 0; i < this.vertices.length; i++) {
			let centerToVertice0 = Sub(this.vertices[i], this.centroid)
			let indexVertice1 = MathHelper.Index(i + 1, this.vertices.length)
			let centerToVertice1 = Sub(this.vertices[indexVertice1], this.centroid)
			let inertiaTriangle =
				(massPerTriangleFace *
					(centerToVertice0.Length2() +
						centerToVertice1.Length2() +
						centerToVertice0.Dot(centerToVertice1))) /
				6
			inertia += inertiaTriangle
		}

		return inertia
	}

	/**
	 * Rotates the polygon by the specified angle in radians and updates normals.
	 *
	 * @param radiansDelta - The angle to rotate the polygon by, in radians.
	 */
	rotate(radiansDelta: number): void {
		super.rotate(radiansDelta)
		this.normals = MathHelper.calcNormals(this.vertices)
	}

	draw(ctx: CanvasRenderingContext2D): void {
		super.draw(ctx)
		DrawUtils.drawPoint(this.centroid, 5, "black")

		// Drawing the normal vector
		for (let i = 0; i < this.vertices.length; i++) {
			let direction = Sub(
				this.vertices[MathHelper.Index(i + 1, this.vertices.length)],
				this.vertices[i],
			)
			// This is the midpoint between vertice1 and vertice2
			let center = Add(this.vertices[i], Scale(direction, 0.5))

			DrawUtils.drawLine(
				center,
				Add(center, Scale(this.normals[i], 15)),
				"black",
			)
		}
	}
}

export { Polygon }
