class Polygon extends Shape {
	constructor(vertices) {
		super(vertices);
	}

	draw(ctx) {
		super.draw(ctx);
		let centroid = MathHelper.calcCentroid(this.vertices);
		DrawUtils.drawPoint(centroid, 5, 'red');
	}
}
