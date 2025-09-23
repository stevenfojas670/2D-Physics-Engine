class Simulation {
	constructor(width, height, force = 5000) {
		// Player movement
		this.force = force;
		this.gravity = new Vector2(0, 5000);
		this.controller = new Controller();
		this.height = height;
		this.width = width;

		// Objects
		this.rigidBodies = [];

		this.rigidBodies.push(
			new Rigidbody(new Circle(new Vector2(600, 300), 50.0), 10)
		);
		this.rigidBodies.push(
			new Rigidbody(new Rectangle(new Vector2(600, 600), 200, 100), 10)
		);
		this.rigidBodies.push(
			new Rigidbody(new Rectangle(new Vector2(200, 600), 100, 200), 10)
		);

		this.rigidBodies[1].getShape().rotate(1.3);
	}

	update(deltaTime) {
		for (let i = 0; i < this.rigidBodies.length; i++) {
			this.rigidBodies[i].update(deltaTime);
		}

		for (let i = 0; i < this.rigidBodies.length; i++) {
			for (let j = 0; j < this.rigidBodies.length; j++) {
				if (i != j) {
					let rigA = this.rigidBodies[i];
					let rigB = this.rigidBodies[j];
					let collisionManifold = CollisionDetection.checkCollisions(
						rigA,
						rigB
					);

					if (collisionManifold != null) {
						collisionManifold.positionalCorrection();
						collisionManifold.resolveCollision();
					}
				}
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
