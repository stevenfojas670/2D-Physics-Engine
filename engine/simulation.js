class Simulation {
	constructor() {
		this.shapes = new Array();

		this.shapes.push(new Rectangle(new Vector2(400, 400), 500, 250));
		this.shapes.push(
			new Polygon([
				new Vector2(25, 25),
				new Vector2(100, 0),
				new Vector2(50, 100),
			])
		);

		this.shapes.push(new Rectangle(new Vector2(950, 400), 500, 250));

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

		// Collision Detection Loop
		for (let i = 0; i < this.shapes.length; i++) {
			for (let j = 0; j < this.shapes.length; j++) {
				if (i == j) continue;

				let objectA = this.shapes[i];
				let objectB = this.shapes[j];
				let result = CollisionDetection.polygonVsPolygon(objectA, objectB);
				console.log(result);

				if (result) {
					let push = Scale(result.normal, result.depth * 0.5);
					objectB.move(push);
					objectA.move(Scale(push, -1));
				}
			}
		}

		this.collisionManifold = null;
	}

	draw(ctx) {
		for (let i = 0; i < this.shapes.length; i++) {
			this.shapes[i].draw(ctx);
		}

		if (this.collisionManifold) {
			this.collisionManifold.draw(ctx);
		}
	}

	/**
	 *
	 * @todo Implement function to allow for assigning to shapes to be controllable.
	 */

	onKeyboardPressed(evt) {
		// console.log(`Keyboard pressed: ${evt.keyCode}`);

		// Moving a shape 5 pixels every frame
		this.moveSpeed = 5;

		switch (evt.key) {
			// Moving shape one
			case 'd':
				this.shapes[0].move(new Vector2(this.moveSpeed, 0));
				break;
			case 'a':
				this.shapes[0].move(new Vector2(-this.moveSpeed, 0));
				break;
			case 's':
				this.shapes[0].move(new Vector2(0, this.moveSpeed));
				break;
			case 'w':
				this.shapes[0].move(new Vector2(0, -this.moveSpeed));
				break;
			// Rotation
			case 'e':
				this.shapes[0].rotate(0.05);
				break;
			case 'q':
				this.shapes[0].rotate(-0.05);
				break;

			// Moving shape two
			case 'ArrowRight':
				this.shapes[1].move(new Vector2(this.moveSpeed, 0));
				break;
			case 'ArrowLeft':
				this.shapes[1].move(new Vector2(-this.moveSpeed, 0));
				break;
			case 'ArrowDown':
				this.shapes[1].move(new Vector2(0, this.moveSpeed));
				break;
			case 'ArrowUp':
				this.shapes[1].move(new Vector2(0, -this.moveSpeed));
				break;
			// Rotation
			case '.':
				this.shapes[1].rotate(0.05);
				break;
			case ',':
				this.shapes[1].rotate(-0.05);
				break;
		}
	}
}
