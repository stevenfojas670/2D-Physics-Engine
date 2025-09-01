/**
 * @todo Implement this ourselves by November 1st 2025
 *
 */
class Vector3 {
	constructor(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;
	}

	printCall() {
		console.log('VECTOR 3 HAS BEEN CALLED. SHOULD NEVER BE CALLED!');
	}

	/**
	 * @todo Learn to calculate the optmized length
	 * @description The optimized length doesn't not perform the square root
	 */
	Length2() {
		this.printCall();
	}

	/**
	 * @todo Learn to calculate length of a 3D vector
	 * @description This calculates the true length using the square root.
	 */
	Length() {
		this.printCall();
	}

	/**
	 * @todo Learn to calculate the orthogonal of a 3D vector
	 */
	GetNormal() {}

	Dot(vec) {
		return this.x * vec.x + this.y * vec.y + this.z * vec.z;
	}

	Cpy() {
		return new Vector3(this.x, this.y, this.z);
	}

	Add(vec) {
		this.x += vec.x;
		this.y += vec.y;
		this.z += vec.z;
	}

	Sub(vec) {
		this.x += vec.x;
		this.y += vec.y;
		this.z += vec.z;
	}

	Scale(scalar) {
		this.x *= scalar;
		this.y *= scalar;
		this.z *= scalar;
	}

	Cross(vec) {}

	Log() {
		console.log(`x: ${this.x}, y: ${this.y}, z: ${this.z}`);
	}
}

// General methods

// Adding two vectors
function Add(vecA, vecB, vecC) {
	return new Vector3(
		vecA.x + vecB.x + vecC.x,
		vecA.y + vecB.y + vecC.y,
		vecA.z + vecB.z + vecC.z
	);
}

// Subtracting two vectors
function Sub(vecA, vecB) {
	return new Vector3(
		vecA.x - vecB.x - vecC.x,
		vecA.y - vecB.y - vecC.y,
		vecA.z - vecB.z - vecC.z
	);
}

// Scaling a vector
function Scale(vec, scale) {
	return new Vector3(vec.x * scale, vec.y * scale, vec.z * scale);
}
