import { Vector2, Sub } from "@/Vector2";

/**
 * MathHelper - A utility class providing mathematical operations for physics engine calculations.
 * 
 * This class contains static methods for polygon calculations including:
 * - Centroid and area calculations
 * - Point rotation transformations
 * - Normal vector computations
 * - Utility functions (clamping, circular indexing)
 * 
 * Reference: https://en.wikipedia.org/wiki/Polygon
 */
class MathHelper {
	/**
	 * Calculates the centroid (center of mass) of a polygon using the shoelace formula.
	 * 
	 * The centroid is computed by iterating through polygon vertices and applying
	 * the mathematical formula for polygon center of mass. This is useful for
	 * determining the center point for rotation, collision detection, and rendering.
	 * 
	 * @param {Array<Vector2>} vertices - Array of Vector2 points representing polygon vertices in order
	 * @returns {Vector2} The centroid position as a Vector2
	 * 
	 * @example
	 * const vertices = [new Vector2(0, 0), new Vector2(4, 0), new Vector2(2, 3)];
	 * const center = MathHelper.calcCentroid(vertices); // Returns centroid of triangle
	 */
	static calcCentroid(vertices: Array<Vector2>): Vector2 {
		// Calculate polygon area (needed for centroid formula)
		let A = this.calcArea(vertices);
		let length = vertices.length;
		let Cx = 0;
		let Cy = 0;

		// Apply shoelace centroid formula for each edge
		for (let i = 0; i < length; i++) {
			let i_next = this.Index(i + 1, length);

			// Centroid X-component: sum of (x_i + x_next) * cross_product / (6 * A)
			Cx +=
				(vertices[i].x + vertices[i_next].x) *
				(vertices[i].x * vertices[i_next].y -
					vertices[i_next].x * vertices[i].y);

			// Centroid Y-component: sum of (y_i + y_next) * cross_product / (6 * A)
			Cy +=
				(vertices[i].y + vertices[i_next].y) *
				(vertices[i].x * vertices[i_next].y -
					vertices[i_next].x * vertices[i].y);
		}

		// Normalize by 6 * area to get final centroid coordinates
		Cx = Cx / (6 * A);
		Cy = Cy / (6 * A);

		return new Vector2(Cx, Cy);
	}

	/**
	 * Calculates the area of a polygon using the shoelace formula (Gauss area formula).
	 * 
	 * This method computes the area by iterating through consecutive vertex pairs
	 * and applying the cross product sum formula. The result is divided by 2 to get
	 * the final area. Used internally by calcCentroid and for collision calculations.
	 * 
	 * @param {Array<Vector2>} vertices - Array of Vector2 points representing polygon vertices in order
	 * @returns {number} The area of the polygon. Returns absolute value for signed area.
	 * 
	 * @example
	 * const vertices = [new Vector2(0, 0), new Vector2(4, 0), new Vector2(2, 3)];
	 * const area = MathHelper.calcArea(vertices); // Returns area of triangle
	 */
	static calcArea(vertices: Array<Vector2>): number {
		// Apply shoelace formula: sum of (x_i * y_next - x_next * y_i) / 2
		let A = 0;
		let length = vertices.length;

		for (let i = 0; i < length; i++) {
			let i_next = this.Index(i + 1, length);

			// Add cross product term for each edge
			A +=
				vertices[i].x * vertices[i_next].y - vertices[i_next].x * vertices[i].y;
		}

		// Divide by 2 to get final area (returns absolute value implicitly)
		return A / 2;
	}

	/**
	 * Implements circular array indexing using modulo arithmetic.
	 * 
	 * This method wraps array indices to create a circular buffer effect. When an index
	 * exceeds the array bounds, it wraps back to the beginning. This is especially useful
	 * for polygon operations where the next vertex after the last one should be the first.
	 * 
	 * @param {number} idx - The desired index (can be negative or exceed array size)
	 * @param {number} arraySize - The size of the array
	 * @returns {number} A valid index in the range [0, arraySize)
	 * 
	 * @example
	 * MathHelper.Index(5, 4);  // Returns 1 (wraps around: (5 + 4) % 4 = 1)
	 * MathHelper.Index(4, 4);  // Returns 0 (first element after last)
	 * MathHelper.Index(-1, 4); // Returns 3 (wraps to the end)
	 */
	static Index(idx: number, arraySize: number): number {
		return (idx + arraySize) % arraySize;
	}

	/**
	 * Constrains a number to be within a specified range.
	 * 
	 * Clamps a value by ensuring it doesn't fall below the minimum or exceed the maximum.
	 * Useful for constraining velocities, forces, or ensuring values stay within valid bounds.
	 * 
	 * @param {number} number - The value to clamp
	 * @param {number} min - The minimum allowed value (inclusive)
	 * @param {number} max - The maximum allowed value (inclusive)
	 * @returns {number} The clamped value where min ≤ result ≤ max
	 * 
	 * @example
	 * MathHelper.clamp(5, 0, 10);   // Returns 5
	 * MathHelper.clamp(-5, 0, 10);  // Returns 0 (clamped to minimum)
	 * MathHelper.clamp(15, 0, 10);  // Returns 10 (clamped to maximum)
	 */
	static clamp(number: number, min: number, max: number): number {
		return Math.min(Math.max(number, min), max);
	}

	/**
	 * Rotates a point around another point by a specified angle.
	 * 
	 * Uses the 2D rotation matrix to rotate the point relative to the pivot point.
	 * The rotation is performed by:
	 * 1. Computing the direction vector from pivot to the point to rotate
	 * 2. Applying 2D rotation matrix transformation
	 * 3. Translating back relative to the pivot point
	 * 
	 * This is essential for rotating rigid bodies around their centroid during physics simulations.
	 * 
	 * @param {Vector2} toRotateVertice - The point to be rotated
	 * @param {Vector2} point - The pivot point around which to rotate
	 * @param {number} radians - The rotation angle in radians (positive = counter-clockwise)
	 * @returns {Vector2} The rotated point coordinates
	 * 
	 * @example
	 * const pointToRotate = new Vector2(1, 0);
	 * const pivot = new Vector2(0, 0);
	 * const rotated = MathHelper.rotateAroundPoint(pointToRotate, pivot, Math.PI / 2);
	 * // rotated is approximately (0, 1) - rotated 90 degrees counter-clockwise
	 */
	static rotateAroundPoint(toRotateVertice: Vector2, point: Vector2, radians: number): Vector2 {
		// Store result
		let rotated = new Vector2(0, 0);

		// Step 1: Get vector from pivot to point (translate to origin)
		let direction = Sub(toRotateVertice, point);

		// Step 2: Apply 2D rotation matrix:
		// [cos(θ)  -sin(θ)] [x]
		// [sin(θ)   cos(θ)] [y]
		rotated.x =
			direction.x * Math.cos(radians) - direction.y * Math.sin(radians);

		rotated.y =
			direction.x * Math.sin(radians) + direction.y * Math.cos(radians);

		// Step 3: Translate back relative to pivot point
		rotated.Add(point);
		return rotated;
	}

	/**
	 * Calculates the outward-pointing normal vectors for each edge of a polygon.
	 * 
	 * The algorithm:
	 * 1. For each vertex, compute the direction vector to the next vertex (edge vector)
	 * 2. Normalize the direction vector to unit length
	 * 3. Get the perpendicular normal vector (90° rotation)
	 * 
	 * These normals are critical for collision detection (Separating Axis Theorem)
	 * and collision response calculations. Each normal is perpendicular to its corresponding edge.
	 * 
	 * @param {Array<Vector2>} vertices - Array of Vector2 points representing polygon vertices in order
	 * @returns {Array<Vector2>} Array of normalized normal vectors, one per edge (same length as vertices array)
	 * 
	 * @example
	 * const vertices = [new Vector2(0, 0), new Vector2(1, 0), new Vector2(0.5, 1)];
	 * const normals = MathHelper.calcNormals(vertices);
	 * // Returns array of 3 unit normal vectors perpendicular to each edge
	 */
	static calcNormals(vertices: Array<Vector2>): Array<Vector2> {
		let normals = [];

		// Calculate outward normal for each edge
		for (let i = 0; i < vertices.length; i++) {
			// Get edge vector from current vertex to next vertex
			let direction = Sub(
				vertices[this.Index(i + 1, vertices.length)],
				vertices[i]
			);

			// Normalize the edge vector to unit length
			direction.Normalize();

			// Rotate 90° counter-clockwise to get perpendicular normal
			// This gives us the outward-pointing normal for collision detection
			normals.push(direction.GetNormal());
		}

		return normals;
	}
}

export default MathHelper;

export { MathHelper }