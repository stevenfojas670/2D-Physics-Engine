class Circle extends Shape {
	constructor(position, radius) {
		super([
			new Vector2(position.x, position.y),
			new Vector2(position.x + radius, position.y),
		]);
		this.position = position;
		this.radius = radius;
		this.setCentroid(position);
	}

	calculateInertia(mass) {
		return mass * (this.radius * this.radius) * 0.5;
	}

	getRadius() {
		return this.radius;
	}

	draw(ctx) {
		super.draw(ctx);
		DrawUtils.strokePoint(this.position, this.radius, this.color);
	}
}
