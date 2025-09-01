class Simulation {
	constructor(controller = null, moveSpeed = 2) {
		this.moveSpeed = moveSpeed;
		this.controller = controller;
		this.shapes = new Array();
		this.shapes.push(new Circle(new Vector2(600, 300), 100));
		// this.shapes.push(
		// 	new Polygon([
		// 		new Vector2(0, 0),
		// 		new Vector2(100, 0),
		// 		new Vector2(50, 100),
		// 	])
		// );
		this.shapes.push(new Rectangle(new Vector2(600, 600), 150, 150));

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
				let result = CollisionDetection.checkCollisions(objectA, objectB);
				//console.log(result);

				if (result) {
					let push = Scale(result.normal, result.depth * 0.5);
					objectB.move(push);
					push = Scale(result.normal, result.depth * -0.5);
					objectA.move(push);
				}
			}
		}

		this.collisionManifold = null;
		this.normalizedSpeed = this.moveSpeed * deltaTime;
		this.pollMovement();
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

	pollMovement() {
		// this.controller.log();

		// Moving shape one
		if (this.controller.keys.d) {
			this.shapes[0].move(new Vector2(this.normalizedSpeed, 0));
		}
		if (this.controller.keys.a) {
			this.shapes[0].move(new Vector2(-this.normalizedSpeed, 0));
		}
		if (this.controller.keys.s) {
			this.shapes[0].move(new Vector2(0, this.normalizedSpeed));
		}
		if (this.controller.keys.w) {
			this.shapes[0].move(new Vector2(0, -this.normalizedSpeed));
		}
		if (this.controller.keys.e) {
			this.shapes[0].rotate(0.05);
		}
		if (this.controller.keys.q) {
			this.shapes[0].rotate(-0.05);
		}

		// Moving shape two
		if (this.controller.keys.ArrowRight) {
			this.shapes[1].move(new Vector2(this.normalizedSpeed, 0));
		}
		if (this.controller.keys.ArrowLeft) {
			this.shapes[1].move(new Vector2(-this.normalizedSpeed, 0));
		}
		if (this.controller.keys.ArrowDown) {
			this.shapes[1].move(new Vector2(0, this.normalizedSpeed));
		}
		if (this.controller.keys.ArrowUp) {
			this.shapes[1].move(new Vector2(0, -this.normalizedSpeed));
		}
		if (this.controller.keys['.']) {
			this.shapes[1].rotate(0.05);
		}
		if (this.controller.keys[',']) {
			this.shapes[1].rotate(-0.05);
		}
	}

	/**
	 *
	 * @param {number} speed - Desired movement speed
	 */
	setMoveSpeed(speed) {
		this.moveSpeed = speed;
	}

	/**
	 *
	 * @returns {number} moveSpeed - The current movement speed value.
	 */
	getMoveSpeed() {
		return this.moveSpeed;
	}
}
