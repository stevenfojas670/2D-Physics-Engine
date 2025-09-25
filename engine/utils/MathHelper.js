class MathHelper {
	// Static methods for calculating center for a polygon
	// https://en.wikipedia.org/wiki/Polygon

	/**
	 *
	 * @param {Array} vertices
	 * @returns {Vector2} Vector2 of the centroid
	 */
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

	/**
	 *
	 * @param {Array} vertices
	 * @returns {number} Area of a polygon.
	 */
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

	/**
	 * @description Turns an array into a circular buffer.
	 * @example If idx is the next element after the final element in the array
	 * then the first element of the array is returned, creating a circular buffer.
	 * @param {number} idx | Desired index
	 * @param {number} arraySize | Size of array
	 * @returns {number} | First element of the array
	 */
	static Index(idx, arraySize) {
		return (idx + arraySize) % arraySize;
	}

	/**
	 * @description
	 * @param
	 * @param
	 * @returns x where min < x < max
	 */
	static clamp(number, min, max) {
		return Math.min(Math.max(number, min), max);
	}

	/**
	 *
	 * @param {Vector2} toRotateVertice
	 * @param {Vector2} point
	 * @param {number} radians
	 * @description Method to rotate a point around another point
	 * @returns {Vector2} rotated vertices
	 */
	static rotateAroundPoint(toRotateVertice, point, radians) {
		// Result of calculation
		let rotated = new Vector2(0, 0);

		// Direction vector
		let direction = Sub(toRotateVertice, point);

		// Calculate the rotated point
		rotated.x =
			direction.x * Math.cos(radians) - direction.y * Math.sin(radians);

		rotated.y =
			direction.x * Math.sin(radians) + direction.y * Math.cos(radians);

		// Adding vertices to centroid point so that the rotation occurs around the centroid
		rotated.Add(point);
		return rotated;
	}

	/**
	 * @description: Calculates the normal by:
	 * 1: Calculating the direction vector between edges.
	 * 2: Normalize the direction
	 * 3: Get the normal of that direction vector.
	 * @param {Array} vertices
	 * @returns {Array} Array of normalized normals (orthogonal) of each vertice.
	 */
	static calcNormals(vertices) {
		let normals = [];

		for (let i = 0; i < vertices.length; i++) {
			let direction = Sub(
				vertices[this.Index(i + 1, vertices.length)],
				vertices[i]
			);
			direction.Normalize();
			normals.push(direction.GetNormal());
		}

		return normals;
	}
}
