class Simulation {
	constructor(worldSize, force = 20000) {
		/**
		 * @todo Create a Builder pattern for initializing the simulation
		 * @description There will be so many parameters to configure for the user
		 */

		// Player movement
		this.force = force * 10;
		this.gravity = new Vector2(0, 100);
		this.controller = new Controller();
		this.worldSize = worldSize;

		// Objects
		this.rigidBodies = [];

		this.createBoundary();

		this.rigidBodies.push(
			new Rigidbody(new Circle(new Vector2(900, 300), 50.0), 10)
		);

		this.rigidBodies.push(
			new Rigidbody(new Circle(new Vector2(400, 300), 50.0), 10)
		);

		this.rigidBodies.push(
			new Rigidbody(new Rectangle(new Vector2(200, 600), 200, 100), 5)
		);

		this.rigidBodies.push(
			new Rigidbody(
				new Rectangle(new Vector2(500, this.worldSize.y / 2), 100, 800),
				500
			)
		);
	}

	createBoundary() {
		// Top Boundary
		this.rigidBodies.push(
			new Rigidbody(
				new Rectangle(
					new Vector2(this.worldSize.x / 2, 0),
					this.worldSize.x,
					1
				),
				0
			)
		);

		// Bottom Boundary
		this.rigidBodies.push(
			new Rigidbody(
				new Rectangle(
					new Vector2(this.worldSize.x / 2, this.worldSize.y),
					this.worldSize.x,
					1
				),
				0
			)
		);

		// Left Boundary
		this.rigidBodies.push(
			new Rigidbody(
				new Rectangle(
					new Vector2(0, this.worldSize.y / 2),
					1,
					this.worldSize.y
				),
				0
			)
		);

		// Right Boundary
		this.rigidBodies.push(
			new Rigidbody(
				new Rectangle(
					new Vector2(this.worldSize.x, this.worldSize.y / 2),
					1,
					this.worldSize.y
				),
				0
			)
		);
	}

	update(deltaTime) {
		for (let i = 0; i < this.rigidBodies.length; i++) {
			this.rigidBodies[i].update(deltaTime);

			// F = m * a
			this.rigidBodies[i].addForce(
				Scale(this.gravity, this.rigidBodies[i].mass)
			);
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
		this.normalizedSpeed = this.force * deltaTime; // My implementation
		// this.normalizedSpeed = this.force; // Following the video
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

		let length = this.rigidBodies.length;

		// Moving shape one
		if (this.controller.keys.d) {
			this.rigidBodies[length - 4].addForce(
				new Vector2(this.normalizedSpeed, 0)
			);
		}
		if (this.controller.keys.a) {
			this.rigidBodies[length - 4].addForce(
				new Vector2(-this.normalizedSpeed, 0)
			);
		}
		if (this.controller.keys.s) {
			this.rigidBodies[length - 4].addForce(
				new Vector2(0, this.normalizedSpeed)
			);
		}
		if (this.controller.keys.w) {
			this.rigidBodies[length - 4].addForce(
				new Vector2(0, -this.normalizedSpeed)
			);
		}
		// if (this.controller.keys.e) {
		// 	this.rigidBodies[0].rotate(0.05);
		// }
		// if (this.controller.keys.q) {
		// 	this.rigidBodies[0].rotate(-0.05);
		// }

		// Moving shape two
		if (this.controller.keys.ArrowRight) {
			this.rigidBodies[length - 5].addForce(
				new Vector2(this.normalizedSpeed, 0)
			);
		}
		if (this.controller.keys.ArrowLeft) {
			this.rigidBodies[length - 5].addForce(
				new Vector2(-this.normalizedSpeed, 0)
			);
		}
		if (this.controller.keys.ArrowDown) {
			this.rigidBodies[length - 5].addForce(
				new Vector2(0, this.normalizedSpeed)
			);
		}
		if (this.controller.keys.ArrowUp) {
			this.rigidBodies[length - 5].addForce(
				new Vector2(0, -this.normalizedSpeed)
			);
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
