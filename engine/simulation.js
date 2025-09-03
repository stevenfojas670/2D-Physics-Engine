class Simulation {
	constructor(width, height, controller = null, force = 5) {
		// Player movement
		this.force = force;
		this.gravity = new Vector2(0, 5000);
		this.controller = controller;
		this.height = height;
		this.width = width;

		// Objects
		this.rigidBodies = [];

		this.rigidBodies.push(
			new Rigidbody(new Circle(new Vector2(600, 300), 50.0), 10)
		);
		this.rigidBodies.push(
			new Rigidbody(new Circle(new Vector2(300, 100), 100.0), 10)
		);
		this.rigidBodies.push(
			new Rigidbody(new Circle(new Vector2(1000, 100), 75.0), 10)
		);
	}

	update(deltaTime) {
		let center = null;
		let radius = null;
		for (let i = 0; i < this.rigidBodies.length; i++) {
			this.rigidBodies[i].addForce(this.gravity); // Applying gravity to all rigidbodies
			this.rigidBodies[i].update(deltaTime);

			center = this.rigidBodies[i].getShape().getCentroid();

			if (this.rigidBodies[i].getShape() instanceof Circle) {
				radius = this.rigidBodies[i].getShape().getRadius();
			}

			if (center.y + radius >= this.height) {
				console.log('Invert Velocity');
				let velocity = this.rigidBodies[i].getVelocity();
				this.rigidBodies[i].setVelocity(Scale(velocity, -1));
			}
		}
		this.rigidBodies[0].log();

		// Handling movement
		// this.normalizedSpeed = this.force * deltaTime; My implementation
		this.normalizedSpeed = this.force; // Following the video
		this.pollMovement();
	}

	draw(ctx) {
		for (let i = 0; i < this.rigidBodies.length; i++) {
			this.rigidBodies[i].getShape().draw(ctx);
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
			this.rigidBodies[0].addForce(new Vector2(this.normalizedSpeed, 0));
		}
		if (this.controller.keys.a) {
			this.rigidBodies[0].addForce(new Vector2(-this.normalizedSpeed, 0));
		}
		if (this.controller.keys.s) {
			this.rigidBodies[0].addForce(new Vector2(0, this.normalizedSpeed));
		}
		if (this.controller.keys.w) {
			this.rigidBodies[0].addForce(new Vector2(0, -this.normalizedSpeed));
		}
		// if (this.controller.keys.e) {
		// 	this.rigidBodies[0].rotate(0.05);
		// }
		// if (this.controller.keys.q) {
		// 	this.rigidBodies[0].rotate(-0.05);
		// }

		// Moving shape two
		if (this.controller.keys.ArrowRight) {
			this.rigidBodies[1].addForce(new Vector2(this.normalizedSpeed, 0));
		}
		if (this.controller.keys.ArrowLeft) {
			this.rigidBodies[1].addForce(new Vector2(-this.normalizedSpeed, 0));
		}
		if (this.controller.keys.ArrowDown) {
			this.rigidBodies[1].addForce(new Vector2(0, this.normalizedSpeed));
		}
		if (this.controller.keys.ArrowUp) {
			this.rigidBodies[1].addForce(new Vector2(0, -this.normalizedSpeed));
		}
		// if (this.controller.keys['.']) {
		// 	this.rigidBodies[1].rotate(0.05);
		// }
		// if (this.controller.keys[',']) {
		// 	this.rigidBodies[1].rotate(-0.05);
		// }
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
