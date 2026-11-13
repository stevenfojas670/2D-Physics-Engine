import { Vector2 } from "@/Vector2"
import { Polygon } from "./Polygon"

class Rectangle extends Polygon {
	private width: number
	private height: number

	constructor(position: Vector2, width: number, height: number) {
		super([
			new Vector2(position.x - width / 2, position.y - height / 2),

			new Vector2(position.x + width / 2, position.y - height / 2),

			new Vector2(position.x + width / 2, position.y + height / 2),

			new Vector2(position.x - width / 2, position.y + height / 2),
		])

		this.width = width
		this.height = height
	}

	calculateInertia(mass: number): number {
		return (mass * (this.width * this.width + this.height * this.height)) / 12
	}
}

export { Rectangle }
