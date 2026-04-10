import { Vector2 } from "@/Vector2";

class Rectangle extends Polygon {
    private position: Vector2;
    private width: number;
    private height: number;

	constructor(position: Vector2, width: number, height: number) {
		super([
			// Top left corner
			new Vector2(position.x - width / 2, position.y - height / 2),

			// Top right corner
			new Vector2(position.x + width / 2, position.y - height / 2),

			// Bottom right corner
			new Vector2(position.x + width / 2, position.y + height / 2),

			// Bottom left corner
			new Vector2(position.x - width / 2, position.y + height / 2),
		]);

		this.position = position;
		this.width = width;
		this.height = height;
	}

	calculateInertia(mass: number): number {
		return (mass * (this.width * this.width + this.height * this.height)) / 12;
	}
}

export { Rectangle }
