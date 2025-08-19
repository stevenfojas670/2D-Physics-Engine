class MathHelper {
	// Static methods for calculating center for a polygon
	// https://en.wikipedia.org/wiki/Polygon

	static calcCentroid(vertices) {
		// Calculating centroid
		let A = this.calcArea(vertices);
		let length = vertices.length;
		let Cx = 0;
		let Cy = 0;

		for (let i = 0; i < length; i++) {
			let i_next = this.Index(i + 1, length);

			// Calculating Cx
			Cx +=
				(vertices[i].x + vertices[i_next].x) *
				(vertices[i].x * vertices[i_next].y -
					vertices[i_next].x * vertices[i].y);

			// Calculating Cy
			Cy +=
				(vertices[i].y + vertices[i_next].y) *
				(vertices[i].x * vertices[i_next].y -
					vertices[i_next].x * vertices[i].y);
		}

		Cx = Cx / (6 * A);
		Cy = Cy / (6 * A);

		return new Vector2(Cx, Cy);
	}

	static calcArea(vertices) {
		// Calculating the Area for CalCentroid formula
		let A = 0;
		let length = vertices.length;

		for (let i = 0; i < length; i++) {
			let i_next = this.Index(i + 1, length);

			A +=
				vertices[i].x * vertices[i_next].y - vertices[i_next].x * vertices[i].y;
		}

		return A / 2;
	}

	// Circular index -> If the loop goes out of bounds it will just return the first index
	static Index(idx, arraySize) {
		return (idx + arraySize) % arraySize;
	}

	// Method to rotate a point around another point
	static rotateAroundPoint(toRotateVertice, point, radians) {
		// Result of calculation
		let rotated = new Vector2(0, 0);

		// Direction vector
		let direction = Sub(toRotateVertice, point);

		// Calculate the rotated point
		rotated.x =
			direction.x * Math.cos(radians) - direction.y * Math.sin(radians);

		rotated.y =
			direction.x * Math.sin(radians) + direction.y * Math.sin(radians);

		rotated.Add(point);
		return rotated;
	}
}
