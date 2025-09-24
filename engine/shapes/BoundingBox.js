/**
 * @class BoundingBox
 * @classdesc ...
 *
 * @property {} vertices - Array of shape vertices (Vector2)
 */
class BoundingBox {
	constructor() {
		this.topLeft = new Vector2(0, 0);
		this.bottomRight = new Vector2(0, 0);
	}

	intersect() {}

	draw(ctx) {
		ctx.beginPath();
		let width = this.bottomRight.x - this.topLeft.x;
		let height = this.bottomRight.y - this.topLeft.y;
		ctx.rect(this.topLeft.x, this.topLeft.y, width, height);
		ctx.stroke();
		ctx.strokeStyle = 'black';
		ctx.closePath();
	}
}
