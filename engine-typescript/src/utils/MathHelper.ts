import { Vector2, subtract } from "@/Vector2"

class MathHelper {
	static calcCentroid(vertices: Array<Vector2>): Vector2 {
		const area = this.calcArea(vertices)
		const length = vertices.length
		let cx = 0
		let cy = 0

		for (let i = 0; i < length; i++) {
			const iNext = this.wrapIndex(i + 1, length)

			cx +=
				(vertices[i].x + vertices[iNext].x) *
				(vertices[i].x * vertices[iNext].y - vertices[iNext].x * vertices[i].y)

			cy +=
				(vertices[i].y + vertices[iNext].y) *
				(vertices[i].x * vertices[iNext].y - vertices[iNext].x * vertices[i].y)
		}

		cx = cx / (6 * area)
		cy = cy / (6 * area)

		return new Vector2(cx, cy)
	}

	static calcArea(vertices: Array<Vector2>): number {
		let area = 0
		const length = vertices.length

		for (let i = 0; i < length; i++) {
			const iNext = this.wrapIndex(i + 1, length)

			area +=
				vertices[i].x * vertices[iNext].y - vertices[iNext].x * vertices[i].y
		}

		return area / 2
	}

	static wrapIndex(idx: number, arraySize: number): number {
		return (idx + arraySize) % arraySize
	}

	static clamp(number: number, min: number, max: number): number {
		return Math.min(Math.max(number, min), max)
	}

	static rotateAroundPoint(
		toRotateVertice: Vector2,
		point: Vector2,
		radians: number,
	): Vector2 {
		const rotated = new Vector2(0, 0)

		const direction = subtract(toRotateVertice, point)

		rotated.x =
			direction.x * Math.cos(radians) - direction.y * Math.sin(radians)

		rotated.y =
			direction.x * Math.sin(radians) + direction.y * Math.cos(radians)

		rotated.add(point)
		return rotated
	}

	static calcNormals(vertices: Array<Vector2>): Array<Vector2> {
		const normals = []

		for (let i = 0; i < vertices.length; i++) {
			const direction = subtract(
				vertices[this.wrapIndex(i + 1, vertices.length)],
				vertices[i],
			)

			direction.normalize()

			normals.push(direction.perpendicular())
		}

		return normals
	}
}

export { MathHelper }
