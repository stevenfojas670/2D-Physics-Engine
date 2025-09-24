/**
 * @class Shape
 * @classdesc Represents a generic shape in the physics engine.
 * This abstract class is inherited by all other shape types.
 *
 * @property {Vector2[]} vertices - Array of shape vertices (Vector2)
 * @property {string} color - Optional color, defaults to 'black'
 * @property {Vector2} centroid - Center of the shape
 */
class Shape {
	/**
	 * @constructor
	 * @param {Vector2} vertices - The vertices that define the shape.
	 * @throws {TypeError} Throws if instantiated directly instead of via subclass
	 */
	constructor(vertices) {
		this.vertices = vertices;
		this.color = 'black';
		this.boundingBox = new BoundingBox();

		if (new.target === Shape) {
			throw new TypeError(
				"Cannot construct abstract instances of class 'Shape'."
			);
		}
	}

	/**
	 * Sets the shapes color
	 * @param {string} color - The new color for the shape.
	 * @returns {void}
	 */
	setColor(color) {
		this.color = color;
	}

	calculateBoundingBox() {
		let topLeft = new Vector2(Number.MAX_VALUE, Number.MAX_VALUE);
		let bottomRight = new Vector2(Number.MIN_VALUE, Number.MIN_VALUE);

		for (let i = 0; i < this.vertices.length; i++) {
			let [x, y] = [this.vertices[i].x, this.vertices[i].y];

			if (x < topLeft.x) topLeft.x = x;
			if (y < topLeft.y) topLeft.y = y;
			if (x > bottomRight.x) bottomRight.x = x;
			if (y > bottomRight.y) bottomRight.y = y;
		}

		this.boundingBox.topLeft = topLeft;
		this.boundingBox.bottomRight = bottomRight;
	}

	/**
	 * Sets the shape's centroid position.
	 * @param {Vector2} position - The new centroid position.
	 * @returns {void}
	 */
	setCentroid(position) {
		this.centroid = position;
	}

	/**
	 * Gets the shape's centroid position.
	 * @returns {Vector2 | undefined} The current centroid position.
	 */
	getCentroid() {
		return this.centroid;
	}

	/**
	 * Draws the shape on the provided 2D rendering context.
	 * @param {CanvasRenderingContext2D} ctx - Canvas context to draw on.
	 * @returns {void}
	 */
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

		this.boundingBox.draw(ctx);
	}

	/**
	 * Moves the shape by the delta vector.
	 * @param {Vector2} delta - The vector by which to move all vertices and the centroid.
	 * @returns {void}
	 */
	move(delta) {
		for (let i = 0; i < this.vertices.length; i++) {
			this.vertices[i].Add(delta);
		}
		this.centroid.Add(delta);

		this.boundingBox.topLeft.Add(delta);
		this.boundingBox.bottomRight.Add(delta);
	}

	/**
	 * Rotates the shape around its centroid.
	 * @param {number} radiansDelta - Angle in radians by which to rotate the shape.
	 * @returns {void}
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

		this.calculateBoundingBox();
	}
}
