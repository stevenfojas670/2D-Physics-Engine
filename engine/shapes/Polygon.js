class Polygon extends Shape {
	constructor(vertices) {
		super(vertices);
		let centroid = MathHelper.calcCentroid(vertices);
		this.setCentroid(centroid);
		this.normals = MathHelper.calcNormals(vertices);
	}

	rotate(radiansDelta) {
		super.rotate(radiansDelta);
		this.normals = MathHelper.calcNormals(this.vertices);
	}

	draw(ctx) {
		super.draw(ctx);
		DrawUtils.drawPoint(this.centroid, 5, 'black');

		// Drawing the normal vector
		for (let i = 0; i < this.vertices.length; i++) {
			let direction = Sub(
				this.vertices[MathHelper.Index(i + 1, this.vertices.length)],
				this.vertices[i]
			);
			// This is the midpoint between vertice1 and vertice2
			let center = Add(this.vertices[i], Scale(direction, 0.5));

			DrawUtils.drawLine(
				center,
				Add(center, Scale(this.normals[i], 15)),
				'black'
			);
		}
	}
}
