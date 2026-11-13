class Vector2 {
	public x: number = 0

	public y: number = 0

	constructor(x: number = 0.0, y: number = 0.0) {
		this.x = x
		this.y = y
	}

	invert(): void {
		this.x = -this.x
		this.y = -this.y
	}

	normalize(): void {
		const length = this.length()

		if (length > 0) {
			this.x /= length
			this.y /= length
		}
	}

	lengthSquared(): number {
		return this.x * this.x + this.y * this.y
	}

	length(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y)
	}

	perpendicular(): Vector2 {
		return new Vector2(this.y, -this.x)
	}

	dot(vec: Vector2): number {
		return this.x * vec.x + this.y * vec.y
	}

	copy(): Vector2 {
		return new Vector2(this.x, this.y)
	}

	add(vec: Vector2): void {
		this.x += vec.x
		this.y += vec.y
	}

	plus(vec: Vector2): Vector2 {
		return new Vector2(this.x + vec.x, this.y + vec.y)
	}

	subtract(vec: Vector2): void {
		this.x -= vec.x
		this.y -= vec.y
	}

	minus(vec: Vector2): Vector2 {
		return new Vector2(this.x - vec.x, this.y - vec.y)
	}

	scale(scalar: number): void {
		this.x *= scalar
		this.y *= scalar
	}

	times(scalar: number): Vector2 {
		return new Vector2(this.x * scalar, this.y * scalar)
	}

	multiplyComponents(vec: Vector2): void {
		this.x *= vec.x
		this.y *= vec.y
	}

	addScaled(vec: Vector2, scalar: number): void {
		this.x += vec.x * scalar
		this.y += vec.y * scalar
	}

	cross(vec: Vector2): number {
		return this.x * vec.y - this.y * vec.x
	}

	log(): void {
		console.log(`x: ${this.x}, y: ${this.y}`)
	}
}

function add(vecA: Vector2, vecB: Vector2): Vector2 {
	return new Vector2(vecA.x + vecB.x, vecA.y + vecB.y)
}

function subtract(vecA: Vector2, vecB: Vector2): Vector2 {
	return new Vector2(vecA.x - vecB.x, vecA.y - vecB.y)
}

function scale(vecA: Vector2, scale: number): Vector2 {
	return new Vector2(vecA.x * scale, vecA.y * scale)
}

function componentProduct(vecA: Vector2, vecB: Vector2): Vector2 {
	return new Vector2(vecA.x * vecB.x, vecA.y * vecB.y)
}

export { Vector2, add, subtract, scale, componentProduct }
