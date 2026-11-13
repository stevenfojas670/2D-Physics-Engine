/**
 * 2D vector type for physics and rendering operations.
 *
 * This class supports common vector operations such as addition,
 * scaling, normalization, and dot/cross products.
 */
class Vector2 {
	/** The X component of the vector. */
	public x: number = 0

	/** The Y component of the vector. */
	public y: number = 0

	/**
	 * Create a new 2D vector.
	 *
	 * @param x - The X component.
	 * @param y - The Y component.
	 */
	constructor(x: number = 0.0, y: number = 0.0) {
		this.x = x
		this.y = y
	}

	/**
	 * Invert the vector in place.
	 *
	 * This is equivalent to multiplying both components by -1.
	 */
	invert(): void {
		this.x = -this.x
		this.y = -this.y
	}

	/**
	 * Normalize the vector in place.
	 *
	 * If the vector is zero length, it remains unchanged.
	 */
	normalize(): void {
		const length = this.length()

		if (length > 0) {
			this.x /= length
			this.y /= length
		}
	}

	/**
	 * Get the squared length of the vector.
	 *
	 * @returns The squared magnitude (x^2 + y^2).
	 */
	lengthSquared(): number {
		return this.x * this.x + this.y * this.y
	}

	/**
	 * Get the Euclidean length of the vector.
	 *
	 * @returns The length of the vector.
	 */
	length(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y)
	}

	/**
	 * Get a perpendicular vector.
	 *
	 * @returns A new vector rotated 90 degrees clockwise.
	 */
	perpendicular(): Vector2 {
		return new Vector2(this.y, -this.x)
	}

	/**
	 * Compute the dot product with another vector.
	 *
	 * @param vec - The vector to dot with.
	 * @returns The dot product.
	 */
	dot(vec: Vector2): number {
		return this.x * vec.x + this.y * vec.y
	}

	/**
	 * Create a copy of this vector.
	 *
	 * @returns A new vector with the same components.
	 */
	copy(): Vector2 {
		return new Vector2(this.x, this.y)
	}

	/**
	 * Add another vector to this vector in place.
	 *
	 * @param vec - The vector to add.
	 */
	add(vec: Vector2): void {
		this.x += vec.x
		this.y += vec.y
	}

	/**
	 * Add another vector and return the result.
	 *
	 * @param vec - The vector to add.
	 * @returns A new vector representing the sum.
	 */
	plus(vec: Vector2): Vector2 {
		return new Vector2(this.x + vec.x, this.y + vec.y)
	}

	/**
	 * Subtract another vector from this vector in place.
	 *
	 * @param vec - The vector to subtract.
	 */
	subtract(vec: Vector2): void {
		this.x -= vec.x
		this.y -= vec.y
	}

	/**
	 * Subtract another vector and return the result.
	 *
	 * @param vec - The vector to subtract.
	 * @returns A new vector representing the difference.
	 */
	minus(vec: Vector2): Vector2 {
		return new Vector2(this.x - vec.x, this.y - vec.y)
	}

	/**
	 * Scale the vector in place.
	 *
	 * @param scalar - The value to scale by.
	 */
	scale(scalar: number): void {
		this.x *= scalar
		this.y *= scalar
	}

	/**
	 * Return a scaled copy of this vector.
	 *
	 * @param scalar - The scale factor.
	 * @returns A new scaled vector.
	 */
	times(scalar: number): Vector2 {
		return new Vector2(this.x * scalar, this.y * scalar)
	}

	/**
	 * Multiply this vector component-wise by another vector.
	 *
	 * @param vec - The vector to multiply with.
	 */
	multiplyComponents(vec: Vector2): void {
		this.x *= vec.x
		this.y *= vec.y
	}

	/**
	 * Add a scaled vector to this vector.
	 *
	 * @param vec - The vector to scale and add.
	 * @param scalar - The scale factor.
	 */
	addScaled(vec: Vector2, scalar: number): void {
		this.x += vec.x * scalar
		this.y += vec.y * scalar
	}

	/**
	 * Compute the 2D cross product (determinant) with another vector.
	 *
	 * @param vec - The other vector.
	 * @returns The scalar cross product result.
	 */
	cross(vec: Vector2): number {
		return this.x * vec.y - this.y * vec.x
	}

	/**
	 * Log the vector components to the console.
	 */
	log(): void {
		console.log(`x: ${this.x}, y: ${this.y}`)
	}
}

/**
 * Add two vectors and return a new vector.
 *
 * @param vecA - The first vector.
 * @param vecB - The second vector.
 * @returns The sum of both vectors.
 */
function add(vecA: Vector2, vecB: Vector2): Vector2 {
	return new Vector2(vecA.x + vecB.x, vecA.y + vecB.y)
}

/**
 * Subtract one vector from another and return a new vector.
 *
 * @param vecA - The first vector.
 * @param vecB - The vector to subtract.
 * @returns The difference vector.
 */
function subtract(vecA: Vector2, vecB: Vector2): Vector2 {
	return new Vector2(vecA.x - vecB.x, vecA.y - vecB.y)
}

/**
 * Scale a vector and return a new vector.
 *
 * @param vecA - The vector to scale.
 * @param scale - The scale factor.
 * @returns The scaled vector.
 */
function scale(vecA: Vector2, scale: number): Vector2 {
	return new Vector2(vecA.x * scale, vecA.y * scale)
}

/**
 * Multiply two vectors component-wise and return a new vector.
 *
 * @param vecA - The first vector.
 * @param vecB - The second vector.
 * @returns The component-wise product.
 */
function componentProduct(vecA: Vector2, vecB: Vector2): Vector2 {
	return new Vector2(vecA.x * vecB.x, vecA.y * vecB.y)
}

export { Vector2, add, subtract, scale, componentProduct }
