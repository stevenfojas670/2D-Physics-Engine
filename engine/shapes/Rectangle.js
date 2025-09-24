class Rectangle extends Polygon {
	constructor(position, width, height) {
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

	calculateInertia(mass) {
		return (mass * (this.width * this.width + this.height * this.height)) / 12;
	}
}
