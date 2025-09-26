/**
 * @class Vector2
 * @classdesc Represents the 2D vector class the performs basic vector math.
 *
 * @property {number} x - X position
 * @property {number} y - Y position
 */
class Vector2 {
	/**
	 * @constructor
	 * @param {number} x - X position
	 * @param {number} y - Y position
	 * @default Constructor - Initalize to 0
	 */
	constructor(_x = 0.0, _y = 0.0) {
		this.x = _x;
		this.y = _y;
	}

	Invert() {
		this.x = -this.x;
		this.y = -this.y;
	}

	// Vector Normalization
	Normalize() {
		length = this.Length();

		// Normalizing the components
		if (length > 0) {
			this.x /= length;
			this.y /= length;
		}
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

	/**
	 * @description Calculates the dot product of this vector with passed vector.
	 * @param {Vector2} _vec
	 * @returns {number} Dot Product
	 */
	Dot(_vec) {
		return this.x * _vec.x + this.y * _vec.y;
	}

	// Copy function
	Cpy() {
		return new Vector2(this.x, this.y);
	}

	// Adding vectors
	Add(_vec) {
		this.x += _vec.x;
		this.y += _vec.y;
	}

	Add_Cpy(_vec) {
		return new Vector2(this.x + _vec.x, this.y + _vec.y);
	}

	// Subtracting vectors
	Sub(_vec) {
		this.x -= _vec.x;
		this.y -= _vec.y;
	}

	Sub_Cpy(_vec) {
		return new Vector2(this.x - _vec.x, this.y - _vec.y);
	}

	// Scaling a vector
	Scale(_scalar) {
		this.x *= _scalar;
		this.y *= _scalar;
	}

	// Scale then return a copy
	Multiply_Cpy(_scalar) {
		return new Vector2(this.x * _scalar, this.y * _scalar);
	}

	/**
	 * @description Multiplies two vectors together.
	 * @param {Vector2} _vecA
	 * @param {Vector2} _vecB
	 * @returns {Vector2} New Vector2
	 */
	ComponentProduct(_vecA, _vecB) {
		return new Vector2(_vecA.x * _vecB.x, _vecA.y * _vecB.y);
	}

	/**
	 * @description Multiplies this vector, to passed vector
	 * @param {Vector2} _vec
	 * @returns {null}
	 */
	ComponentProductUpdate(_vec) {
		this.x *= _vec.x;
		this.y *= _vec.y;
	}

	/**
	 * @description Scales a vector and adds it to this.
	 * @param {Vector2} _vec | Vector
	 * @param {number} _scalar | Scalar value
	 * @returns {void}
	 */
	AddScaledVector(_vec, _scalar) {
		this.x += _vec.x * _scalar;
		this.y += _vec.y * _scalar;
	}

	/**
	 * @description Computes the cross product of this and the passed vector.
	 * @param {Vector2} _vec
	 * @returns Cross product
	 */
	Cross(_vec) {
		// This is needed for collision detection
		return this.x * _vec.y - this.y * _vec.x;
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
