class Polygon extends Shape {
	constructor(vertices) {
		super(vertices);
		let centroid = MathHelper.calcCentroid(vertices);
		this.setCentroid(centroid);
	}

	draw(ctx) {
		super.draw(ctx);
	}
}
