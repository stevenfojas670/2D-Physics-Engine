import type { Vector2 } from "@/Vector2"
import { Shape } from "./Shape"

class Cone extends Shape {
	constructor(vertices: Vector2[]) {
		super(vertices)
	}

	calculateInertia(mass: number): number {
		void mass
		return 0
	}
}

export { Cone }
