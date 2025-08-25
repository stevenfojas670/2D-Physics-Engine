class Vector2 {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}

	// Vector Normalization
	Normalize() {
		length = this.Length();

		// Normalizing the components
		this.x /= length;
		this.y /= length;
	}

	/**
	 * @summary Use this for radial triggers, when checking if a point is
	 * within a radius or not. If you want the true length between points,
	 * use Length().
	 * @description performs length calculation of x^2 + y^2 without sqrt.
	 * @returns length2 without using square root.
	 */
	Length2() {
		// Calculating the hypotenuse with sqrt(x^2 + y^2), but without
		// using the square root, as the square root is performance intensive.
		return this.x * this.x + this.y * this.y;
	}

	// Computing the length of the vector using square root
	Length() {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}

	/**
	 * @description Calculates the orthogonal vector.
	 * @returns Vector2(y,-x)
	 */
	GetNormal() {
		return new Vector2(this.y, -this.x);
	}

	// Calculating the Dot product
	Dot(vec) {
		return this.x * vec.x + this.y * vec.y;
	}

	// Copy function
	Cpy() {
		return new Vector2(this.x, this.y);
	}

	// Adding vectors
	Add(vec) {
		this.x += vec.x;
		this.y += vec.y;
	}

	// Subtracting vectors
	Sub(vec) {
		this.x -= vec.x;
		this.y -= vec.y;
	}

	// Scaling a vector
	Scale(scalar) {
		this.x *= scalar;
		this.y *= scalar;
	}

	// Cross product of vector
	Cross(vec) {
		// This is needed for collision detection
		return this.x * vec.y - this.y * vec.x;
	}

	// Logging the coordinates of the vector
	Log() {
		console.log(`x: ${this.x}, y: ${this.y}`);
	}
}

// General methods

// Adding two vectors
function Add(vecA, vecB) {
	return new Vector2(vecA.x + vecB.x, vecA.y + vecB.y);
}

// Subtracting two vectors
function Sub(vecA, vecB) {
	return new Vector2(vecA.x - vecB.x, vecA.y - vecB.y);
}

// Scaling a vector
function Scale(vecA, scale) {
	return new Vector2(vecA.x * scale, vecA.y * scale);
}
