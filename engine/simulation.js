class Simulation {
	constructor() {
		this.testCircleA = new Circle(new Vector2(100, 100), 100);
		this.testCircleB = new Circle(new Vector2(300, 300), 50);

		this.testRect = new Rectangle(new Vector2(400, 400), 500, 250);

		// Draws collisions
		this.collisionManifold = null;
	}

	// Splitting update and draw methods
	update(deltaTime) {
		// console.log(`deltaTime: ${deltaTime}`);
		// console.log(`MousePos x: ${mousePos[0]} y: ${mousePos[1]}`);
		// console.log(
		// 	`Mouse-left pressed: ${mouseDownLeft} - Mouse-right pressed: ${mouseDownRight}`
		// );

		this.collisionManifold = null;

		// let collisionResult = CollisionDetection.circleVsCircleOptimized(
		// 	this.testCircleA,
		// 	this.testCircleB
		// );

		// if (collisionResult) {
		// 	this.testCircleA.setColor('red');
		// 	this.testCircleB.setColor('red');
		// 	this.collisionManifold = collisionResult;
		// 	let push = Scale(collisionResult.normal, collisionResult.depth);
		// 	this.testCircleB.move(push);
		// } else {
		// 	this.testCircleA.setColor('black');
		// 	this.testCircleB.setColor('black');
		// }
	}

	draw(ctx) {
		/*
		DrawUtils.drawPoint(new Vector2(400, 400), 20, 'black');
		DrawUtils.strokePoint(new Vector2(400, 400), 20, 'blue');
		DrawUtils.drawLine(new Vector2(100, 100), new Vector2(500, 500), 'red');
		DrawUtils.drawText(new Vector2(600, 500), 50, 'black', 'Hello World');
		
		DrawUtils.drawArrow(
			new Vector2(200, 600),
			new Vector2(mousePos[0], mousePos[1]),
			'black'
		);
		*/

		this.testRect.draw(ctx);
		this.testCircleB.draw(ctx);
		// this.testRect.draw(ctx);
		// this.testPolygon.draw(ctx);

		if (this.collisionManifold) {
			this.collisionManifold.draw(ctx);
		}
	}

	onKeyboardPressed(evt) {
		// console.log(`Keyboard pressed: ${evt.keyCode}`);

		// Moving a shape 5 pixels every frame
		this.moveSpeed = 5;

		switch (evt.key) {
			// Moving shape one
			case 'd':
				this.testCircleB.move(new Vector2(this.moveSpeed, 0));
				break;
			case 'a':
				this.testCircleB.move(new Vector2(-this.moveSpeed, 0));
				break;
			case 's':
				this.testCircleB.move(new Vector2(0, this.moveSpeed));
				break;
			case 'w':
				this.testCircleB.move(new Vector2(0, -this.moveSpeed));
				break;
			// Rotation
			case 'e':
				this.testCircleB.rotate(0.05);
				break;
			case 'q':
				this.testCircleB.rotate(-0.05);
				break;

			// Moving shape two
			case 'ArrowRight':
				this.testRect.move(new Vector2(this.moveSpeed, 0));
				break;
			case 'ArrowLeft':
				this.testRect.move(new Vector2(-this.moveSpeed, 0));
				break;
			case 'ArrowDown':
				this.testRect.move(new Vector2(0, this.moveSpeed));
				break;
			case 'ArrowUp':
				this.testRect.move(new Vector2(0, -this.moveSpeed));
				break;
			// Rotation
			case '.':
				this.testRect.rotate(0.05);
				break;
			case ',':
				this.testRect.rotate(-0.05);
				break;
		}
	}
}
