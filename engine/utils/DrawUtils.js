// Class for drawing vectors
class DrawUtils {
	static drawPoint(position, radius, color) {
		ctx.beginPath();
		ctx.arc(position.x, position.y, radius, 0, Math.PI * 2, true);
		ctx.fillStyle = color;
		ctx.fill();
		ctx.closePath();
	}

	static strokePoint(position, radius, color) {
		ctx.beginPath();
		ctx.arc(position.x, position.y, radius, 0, Math.PI * 2, true);
		ctx.strokeStyle = color;
		ctx.stroke();
		ctx.closePath();
	}

	static drawLine(startPosition, endPosition, color) {
		ctx.beginPath();
		ctx.moveTo(startPosition.x, startPosition.y);
		ctx.lineTo(endPosition.x, endPosition.y);
		ctx.strokeStyle = color;
		ctx.stroke();
		ctx.closePath();
	}

	static drawRect(startPosition, size, color) {
		ctx.beginPath();
		ctx.strokeStyle = color;
		ctx.rect(startPosition.x, startPosition.y, size.x, size.y);
		ctx.stroke();
		ctx.closePath();
	}

	static drawText(position, size, color, text) {
		ctx.font = size + 'px Arial';
		ctx.fillStyle = color;
		ctx.fillText(text, position.x, position.y);
	}

	static drawArrow(startPosition, arrowHeadPosition, color) {
		this.drawLine(startPosition, arrowHeadPosition, color);

		// Calculate the direction
		let direction = Sub(arrowHeadPosition, startPosition);
		direction.Normalize();

		// Calculate the center of the arrow head
		let arrowHeadCenter = Sub(arrowHeadPosition, Scale(direction, 10));

		// Getting the normalized direction of the left arrow head
		let directionToLeftArrowHead = direction.GetNormal();

		// Scaling the left arrow head position, because it was normalized.
		// We scale because the normalized position was only 1 unit over from
		// the arrow head center.
		let leftArrowHeadPosition = Add(
			arrowHeadCenter,
			Scale(directionToLeftArrowHead, 5)
		);
		this.drawLine(leftArrowHeadPosition, arrowHeadPosition, color);

		// The right arrow head is opposite of the left, so we make it's direction opposite.
		let directionToRightArrowHead = Scale(direction.GetNormal(), -1);
		let rightArrowHeadPosition = Add(
			arrowHeadCenter,
			Scale(directionToRightArrowHead, 5)
		);
		this.drawLine(rightArrowHeadPosition, arrowHeadPosition, color);
	}
}
