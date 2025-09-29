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
		this.rigidBodies = [];
		this.particles = [];
		this.joints = [];

		this.grid = new HashGrid(50);
		this.grid.initialize(this.worldSize, this.rigidBodies);

		this.createBoundary();
		// this.createStressTestPyramid(20, 30);

		// let rect = new Rectangle(new Vector2(200, 400), 200, 100);
		// let rectRigidBody = new Rigidbody(rect, 1);
		// this.rigidBodies.push(rectRigidBody);

		// let circle = new Circle(new Vector2(500, 300), 60.0);
		// let anchorCircleID = circle.createAnchorPoint(new Vector2(40, 5));
		// let circleRigidyBody = new Rigidbody(circle, 1);
		// this.rigidBodies.push(circleRigidyBody);
		// this.rigidBodies.push(
		// 	new Rigidbody(new Circle(new Vector2(600, 300), 60.0), 0.5)
		// );

		console.log(this.rigidBodies.length + ' bodies instantiated');

		// Joint connections
		// let jointConnection = new JointConnection(
		// 	rectRigidBody,
		// 	anchorRectID,
		// 	circleRigidyBody,
		// 	anchorCircleID
		// );
		// this.joints.push(new ForceJoint(jointConnection, 1000));

		// // Grabbing objects
		// this.selectedRigidBody = null;
		// this.selectedPosition = null;
		// this.selectedAnchorId = null;
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
						new Circle(new Vector2(x, y + topOffset), boxSize / 2),
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

	SpawnObject(_object, _mousePosition) {
		switch (_object) {
			case 'Rectangle':
				this.rigidBodies.push(
					new Rigidbody(
						new Rectangle(
							new Vector2(_mousePosition.x, _mousePosition.y),
							100,
							50
						),
						10
					)
				);
				break;
			case 'Polygon':
				break;
			case 'Circle':
				this.rigidBodies.push(
					new Rigidbody(
						new Circle(new Vector2(_mousePosition.x, _mousePosition.y), 50),
						10
					)
				);
				break;
		}
	}

	handleMouseObjectInteraction() {
		if (mouseDownLeft) {
			let id = this.grid.getGridIdFromPosition(mousePos);
			let nearBodies = this.grid.getContentOfCell(id);
			for (let i = 0; i < nearBodies.length; i++) {
				let mouseInside = nearBodies[i].shape.isPointInside(mousePos);

				if (mouseInside && this.selectedRigidBody == null) {
					this.selectedRigidBody = nearBodies[i];
					this.selectedPosition = mousePos.Cpy();
					// to local position
					let localPos = Sub(mousePos, nearBodies[i].getShape().centroid);

					this.selectedAnchorId = nearBodies[i]
						.getShape()
						.createAnchorPoint(localPos);
				}
			}
		} else {
			if (this.selectedRigidBody != null) {
				this.selectedRigidBody.getShape().removeAnchor(this.selectedAnchorId);
				this.selectedRigidBody = null;
			}

			this.selectedAnchorId = null;
			this.selectedPosition = null;
		}

		if (this.selectedRigidBody && this.selectedPosition) {
			let anchorPos = this.selectedRigidBody
				.getShape()
				.getAnchorPos(this.selectedAnchorId);
			let force = Sub(mousePos, anchorPos);
			this.selectedRigidBody.addForceAtPoint(anchorPos, force);
			DrawUtils.drawLine(anchorPos, mousePos, 'black');
		}
	}

	handleJoints() {
		for (let i = 0; i < this.joints.length; i++) {
			this.joints[i].draw();
			this.joints[i].updateConnectionA();
			this.joints[i].updateConnectionB();
		}
	}

	update(deltaTime) {
		this.handleMouseObjectInteraction();
		// this.handleJoints();

		for (let i = 0; i < this.rigidBodies.length; i++) {
			this.rigidBodies[i].update(deltaTime);
			this.rigidBodies[i].getShape().boundingBox.isColliding = false;

			// F = m * a
			this.rigidBodies[i].addForce(
				Scale(this.gravity, this.rigidBodies[i].mass)
			);

			// this.rigidBodies[i].log();
		}

		this.grid.refreshGrid();

		// The higher iteration limit, the more stable
		let iterationLimit = 25;
		for (
			let solverIterations = 0;
			solverIterations < iterationLimit;
			solverIterations++
		) {
			for (let i = 0; i < this.rigidBodies.length; i++) {
				let rigA = this.rigidBodies[i];
				let neighborRigidBodies = this.grid.getNeighborRigidBodies(i, rigA);

				for (let j = 0; j < neighborRigidBodies.length; j++) {
					let rigB = neighborRigidBodies[j];

					let isCollidingWithBoundingBox = rigA
						.getShape()
						.boundingBox.intersect(rigB.getShape().boundingBox);

					if (!isCollidingWithBoundingBox) continue;

					rigA.getShape().boundingBox.isColliding = isCollidingWithBoundingBox;
					rigB.getShape().boundingBox.isColliding = isCollidingWithBoundingBox;

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

		// Handling movement
		this.normalizedSpeed = this.force * deltaTime; // My implementation
		// this.normalizedSpeed = this.force; // Following the video
		this.pollMovement();
	}

	draw(ctx) {
		for (let i = 0; i < this.rigidBodies.length; i++) {
			this.rigidBodies[i].getShape().draw(ctx);
		}

		this.grid.draw();
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
