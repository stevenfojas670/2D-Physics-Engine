// Abstract class that all shapes will inherit from
class Shape {
	constructor(vertices) {
		this.vertices = vertices;

		if (new.target === Shape) {
			throw new TypeError(
				"Cannot construct abstract instances of class 'Shape'."
			);
		}
	}

	draw(ctx) {
		// Drawing lines to each vertices
		for (let i = 1; i < this.vertices.length; i++) {
			DrawUtils.drawLine(this.vertices[i - 1], this.vertices[i], 'black');
		}
		DrawUtils.drawLine(
			this.vertices[this.vertices.length - 1],
			this.vertices[0],
			'black'
		);
	}
}
