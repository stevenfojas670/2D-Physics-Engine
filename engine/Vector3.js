/**
 * @todo Implement this ourselves by November 1st 2025
 *
 */
class Vector3 {
	constructor(_x = 0, _y = 0, _z = 0) {
		this.x = _x;
		this.y = _y;
		this.z = _z;
	}

	Invert() {
		this.x *= -1;
		this.y *= -1;
		this.z *= -1;
	}

	printCall() {
		console.log('VECTOR 3 HAS BEEN CALLED. SHOULD NEVER BE CALLED!');
	}

	// Vector Normalization
	Normalize() {
		length = this.Magnitude();

		// Normalizing the components
		if (length > 0) {
			this.x /= length;
			this.y /= length;
			this.z /= length;
		}
	}

	/**
	 * @todo Learn to calculate the optmized length
	 * @description The optimized length doesn't not perform the square root
	 */
	SquareMagnitude() {
		this.printCall();
	}

	/**
	 * @todo Learn to calculate length of a 3D vector
	 * @description This calculates the true length using the square root.
	 */
	Magnitude() {
		return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
	}

	/**
	 * @todo Learn to calculate the orthogonal of a 3D vector
	 */
	GetNormal() {}

	Dot(_vec) {
		return this.x * _vec.x + this.y * _vec.y + this.z * _vec.z;
	}

	Cpy() {
		return new Vector3(this.x, this.y, this.z);
	}

	Add(_vec) {
		this.x += _vec.x;
		this.y += _vec.y;
		this.z += _vec.z;
	}

	Sub(_vec) {
		this.x += _vec.x;
		this.y += _vec.y;
		this.z += _vec.z;
	}

	Scale(scalar) {
		this.x *= scalar;
		this.y *= scalar;
		this.z *= scalar;
	}

	Cross(_vec) {}

	Log() {
		console.log(`x: ${this.x}, y: ${this.y}, z: ${this.z}`);
	}
}

// General methods

// Adding two _vectors
function Add(_vecA, _vecB, _vecC) {
	return new _vector3(
		_vecA.x + _vecB.x + _vecC.x,
		_vecA.y + _vecB.y + _vecC.y,
		_vecA.z + _vecB.z + _vecC.z
	);
}

// Subtracting two vectors
function Sub(_vecA, _vecB) {
	return new _vector3(
		_vecA.x - _vecB.x - _vecC.x,
		_vecA.y - _vecB.y - _vecC.y,
		_vecA.z - _vecB.z - _vecC.z
	);
}

// Scaling a vector
function Scale(_vec, scale) {
	return new Vector3(_vec.x * scale, _vec.y * scale, _vec.z * scale);
}
