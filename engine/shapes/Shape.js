// Abstract class that all shapes will inherit from
class Shape {
	constructor(vertices) {
		this.vertices = vertices;
		this.color = 'black';
		if (new.target === Shape) {
			throw new TypeError(
				"Cannot construct abstract instances of class 'Shape'."
			);
		}
	}

	setColor(color) {
		this.color = color;
	}

	setCentroid(position) {
		this.centroid = position;
	}

	getCentroid() {
		return this.centroid;
	}

	draw(ctx) {
		// Drawing lines to each vertices
		for (let i = 1; i < this.vertices.length; i++) {
			DrawUtils.drawLine(this.vertices[i - 1], this.vertices[i], this.color);
		}
		DrawUtils.drawLine(
			this.vertices[this.vertices.length - 1],
			this.vertices[0],
			this.color
		);

		// Drawing centroid
		DrawUtils.drawPoint(this.centroid, 5, this.color);
	}

	move(delta) {
		for (let i = 0; i < this.vertices.length; i++) {
			this.vertices[i].Add(delta);
		}
		this.centroid.Add(delta);
	}

	/**
	 *
	 * @param {number} radiansDelta
	 * @description Rotates vertices around it's center by radians.
	 */
	rotate(radiansDelta) {
		for (let i = 0; i < this.vertices.length; i++) {
			let rotatedVertices = MathHelper.rotateAroundPoint(
				this.vertices[i],
				this.centroid,
				radiansDelta
			);
			this.vertices[i] = rotatedVertices;
		}
	}
}
