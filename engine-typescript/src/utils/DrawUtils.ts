import { Vector2, Add, Sub, Scale } from "@/Vector2";

/**
 * Utility helpers for drawing simple shapes and text to a canvas.
 *
 * This class holds a shared static canvas rendering context and exposes
 * common drawing methods for points, lines, rectangles, text, and arrows.
 */
class DrawUtils {

    /**
     * The shared canvas rendering context used by all drawing helpers.
     *
     * Must be initialized before calling any draw method.
     */
    static ctx: CanvasRenderingContext2D;

    /**
     * Initialize the DrawUtils rendering context.
     *
     * @param ctx - The 2D rendering context used for all drawing operations.
     */
    static init(ctx: CanvasRenderingContext2D) {
        DrawUtils.ctx = ctx;
    }

    /**
     * Draw a filled circle at the provided position.
     *
     * @param position - The center position of the point.
     * @param radius - The radius of the point in pixels.
     * @param color - The fill color to use.
     */
    static drawPoint(position : Vector2, radius : number, color : string) {
        DrawUtils.ctx.beginPath();
        DrawUtils.ctx.arc(position.x, position.y, radius, 0, Math.PI * 2, true);
        DrawUtils.ctx.fillStyle = color;
        DrawUtils.ctx.fill();
        DrawUtils.ctx.closePath();
    }

    /**
     * Draw an outlined circle at the provided position.
     *
     * @param position - The center position of the point.
     * @param radius - The radius of the point in pixels.
     * @param color - The stroke color to use.
     */
    static strokePoint(position : Vector2, radius : number, color : string) {
        DrawUtils.ctx.beginPath();
        DrawUtils.ctx.arc(position.x, position.y, radius, 0, Math.PI * 2, true);
        DrawUtils.ctx.strokeStyle = color;
        DrawUtils.ctx.stroke();
        DrawUtils.ctx.closePath();
    }

    /**
     * Draw a straight line between two world positions.
     *
     * @param startPosition - The line start position.
     * @param endPosition - The line end position.
     * @param color - The stroke color to use.
     */
    static drawLine(startPosition: Vector2, endPosition : Vector2, color : string) {
        DrawUtils.ctx.beginPath();
        DrawUtils.ctx.moveTo(startPosition.x, startPosition.y);
        DrawUtils.ctx.lineTo(endPosition.x, endPosition.y);
        DrawUtils.ctx.strokeStyle = color;
        DrawUtils.ctx.stroke();
        DrawUtils.ctx.closePath();
    }

    /**
     * Draw a stroked rectangle.
     *
     * @param startPosition - The top-left corner of the rectangle.
     * @param size - The width and height of the rectangle.
     * @param color - The stroke color to use.
     */
    static drawRect(startPosition : Vector2, size : Vector2, color : string) {
        DrawUtils.ctx.beginPath();
        DrawUtils.ctx.strokeStyle = color;
        DrawUtils.ctx.rect(startPosition.x, startPosition.y, size.x, size.y);
        DrawUtils.ctx.stroke();
        DrawUtils.ctx.closePath();
    }

    /**
     * Draw a text string at the provided position.
     *
     * @param position - The position to draw the text.
     * @param size - The font size in pixels.
     * @param color - The fill color for the text.
     * @param text - The text to render.
     */
    static drawText(position : Vector2, size : number, color : string, text : string) {
        DrawUtils.ctx.font = size + 'px Arial';
        DrawUtils.ctx.fillStyle = color;
        DrawUtils.ctx.fillText(text, position.x, position.y);
    }

    /**
     * Draw an arrow from the start position toward the arrow head position.
     *
     * @param startPosition - The base position of the arrow.
     * @param arrowHeadPosition - The position of the arrowhead tip.
     * @param color - The stroke color to use.
     */
    static drawArrow(startPosition : Vector2, arrowHeadPosition : Vector2, color : string) {
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

        // The right arrow head is opposite of the left, so we make its direction opposite.
        let directionToRightArrowHead = Scale(direction.GetNormal(), -1);
        let rightArrowHeadPosition = Add(
            arrowHeadCenter,
            Scale(directionToRightArrowHead, 5)
        );
        this.drawLine(rightArrowHeadPosition, arrowHeadPosition, color);
    }
}

export { DrawUtils }