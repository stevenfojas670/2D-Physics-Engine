class Simulation {
	constructor(worldSize, force = 20000) {
		/**
		 * @todo Create a Builder pattern for initializing the simulation
		 * @description There will be so many parameters to configure for the user
		 */

		// Player movement
		this.force = force * 10;
		this.gravity = new Vector2(0, 500);
		this.controller = new Controller();
		this.worldSize = worldSize;

		// Objects
		this.rigidBodies = [];

		this.createBoundary();

		this.createStressTestPyramid(50, 10);

		// let rect = new Rectangle(new Vector2(500, 500), 800, 50);
		// rect.rotate(0.2);

		// this.rigidBodies.push(new Rigidbody(rect, 0));
		// this.rigidBodies.push(
		// 	new Rigidbody(new Rectangle(new Vector2(200, 100), 200, 100), 1)
		// );
		// this.rigidBodies.push(
		// 	new Rigidbody(new Circle(new Vector2(500, 300), 60), 1)
		// );
		// this.rigidBodies.push(
		// 	new Rigidbody(new Circle(new Vector2(600, 300), 30), 1)
		// );
	}

	createStressTestPyramid(_boxSize, _iterations) {
		let boxSize = _boxSize;
		let iterations = _iterations;
		let topOffset = this.worldSize.y - iterations * boxSize;

		for (let i = 0; i < iterations; i++) {
			for (let j = iterations; j >= iterations - i; j--) {
				let x = boxSize * i + j * (boxSize / 2);
				let y = boxSize * j;
				this.rigidBodies.push(
					new Rigidbody(
						new Rectangle(new Vector2(x, y + topOffset), boxSize, boxSize),
						1
					)
				);
			}
		}
	}

	createBoundary() {
		// Top Boundary
		this.rigidBodies.push(
			new Rigidbody(
				new Rectangle(
					new Vector2(this.worldSize.x / 2, -25),
					this.worldSize.x,
					50
				),
				false
			)
		);

		// Bottom Boundary
		this.rigidBodies.push(
			new Rigidbody(
				new Rectangle(
					new Vector2(this.worldSize.x / 2, this.worldSize.y + 25),
					this.worldSize.x,
					50
				),
				false
			)
		);

		// Left Boundary
		this.rigidBodies.push(
			new Rigidbody(
				new Rectangle(
					new Vector2(-25, this.worldSize.y / 2),
					50,
					this.worldSize.y
				),
				false
			)
		);

		// Right Boundary
		this.rigidBodies.push(
			new Rigidbody(
				new Rectangle(
					new Vector2(this.worldSize.x + 25, this.worldSize.y / 2),
					50,
					this.worldSize.y
				),
				false
			)
		);
	}

	update(deltaTime) {
		for (let i = 0; i < this.rigidBodies.length; i++) {
			this.rigidBodies[i].update(deltaTime);
			this.rigidBodies[i].getShape().boundingBox.isColliding = false;

			// F = m * a
			this.rigidBodies[i].addForce(
				Scale(this.gravity, this.rigidBodies[i].mass)
			);
		}

		// The higher iteration limit, the more stable
		for (let solverIterations = 0; solverIterations < 60; solverIterations++) {
			for (let i = 0; i < this.rigidBodies.length; i++) {
				for (let j = 0; j < this.rigidBodies.length; j++) {
					if (i != j) {
						let rigA = this.rigidBodies[i];
						let rigB = this.rigidBodies[j];

						let isCollidingWithBoundingBox = rigA
							.getShape()
							.boundingBox.intersect(rigB.getShape().boundingBox);

						if (!isCollidingWithBoundingBox) continue;

						rigA.getShape().boundingBox.isColliding =
							isCollidingWithBoundingBox;
						rigB.getShape().boundingBox.isColliding =
							isCollidingWithBoundingBox;

						let collisionManifold = CollisionDetection.checkCollisions(
							rigA,
							rigB
						);

						if (collisionManifold != null) {
							// collisionManifold.draw();
							collisionManifold.positionalCorrection();
							collisionManifold.resolveCollision();
						}
					}
				}
			}
		}

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
