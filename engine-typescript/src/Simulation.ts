import { Vector2 } from "@/Vector2";
import { Controller } from "@/Controller";
import { Rigidbody } from "@/Rigidbody";
import { Staticbody } from "@/Staticbody";
import { Particle } from "@/particles/Particle";
import { Joint } from "@/joints/Joint";
import { Grid } from "@/optimizations/grids/Grid";


class Simulation {

    private force: number;
    private gravity: Vector2;
    private worldSize: Vector2;
    private rigidBodies: Array<Rigidbody>;
    private staticBodies: Array<Staticbody>;
    private particles: Array<Particle>
    private joints: Array<Joint>
    private grid: Grid;

    public controller: Controller;

	constructor(_worldSize: Vector2, _force: number = 20000) {
		/**
		 * @todo Create a Builder pattern for initializing the simulation
		 * @description There will be so many parameters to configure for the user
		 */

		// Player movement
		this.force = _force;
		this.gravity = new Vector2(0, 0);
		this.controller = new Controller();
		this.worldSize = _worldSize;
		this.rigidBodies = [];
		this.staticBodies = [];
		this.particles = [];
		this.joints = [];

		this.grid = new HashGrid(20);
		this.grid.initialize(this.worldSize, this.rigidBodies);

		this.createBoundary();
		let Polygon = new Rectangle(new Vector2(300,420), 40, 40);
		let PolygonKinematic = new Rigidbody(Polygon, 1);
		this.rigidBodies.push(PolygonKinematic);

		let staticPolygon = new Rectangle(new Vector2(300, 300), 100, 400);
		let staticBody = new Rigidbody(staticPolygon, 0);
		this.rigidBodies.push(staticBody);

		let recA = new Rectangle(new Vector2(200, 200), 50, 100);
		let staticRectangle = new StaticBody(recA)
		this.staticBodies.push(staticRectangle);

		// This means circleRigA cannot collide with circleRigB
		PolygonKinematic.setCollisionGroup(CollisionGroups.GROUP1);

		// Setting names of the collision groups
		CollisionGroups.GROUP1.name = "Kinematic Objects";
		CollisionGroups.GROUP2.name = "Static Objects";

		this.disableCollisionBetweenGroups(CollisionGroups.GROUP1, CollisionGroups.GROUP2);
	}

	/**
	 * @summary Rigidbodies can only collide with other objects within the
	 * same Collision Group. Different groups will result in anything other than 0.
	 * @param {*} rigi | Rigidbody to check collision mask
	 * @returns 
	 */
	canCollide(groupA, groupB){
		return (CollisionMatrix[groupA] & groupB) != 0;
	}

	// HELPER METHODS ----START----
	enableCollisionBetweenGroups(groupA, groupB) {
		CollisionMatrix[groupA.id] |= groupB.id;
		CollisionMatrix[groupB.id] |= groupA.id;
	}

	disableCollisionBetweenGroups(groupA, groupB) {
		CollisionMatrix[groupA.id] &= ~groupB.id;
		CollisionMatrix[groupB.id] &= ~groupA.id;
	}
	// HELPER METHODS ----END----

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

		/**
		 * Updating RigidBody motion
		 */
		for (let i = 0; i < this.rigidBodies.length; i++) {
			this.rigidBodies[i].update(deltaTime);
			this.rigidBodies[i].getShape().boundingBox.isColliding = false;

			// F = m * a
			this.rigidBodies[i].addForce(
				Scale(this.gravity, this.rigidBodies[i].mass)
			);

			// this.rigidBodies[i].log();
		}

		/**
		 * Updating Particle motion
		 */
		for (let i = 0; i < this.particles.length; i++) {
			this.particles[i].update(deltaTime);
		}

		this.grid.refreshGrid();

		/**
		 * Performing Collision Detection and Response on RigidBodies
		 */
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

					// Collision Checks
					if (this.canCollide(rigA.collisionGroup, rigB.collisionGroup)) {
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
		}

		// Handling movement
		this.normalizedSpeed = 10000 * deltaTime; // My implementation
		// this.normalizedSpeed = this.force; // Following the video
		this.pollMovement();
	}

	/**
	 * Draws all objects.
	 * @param {} ctx - Canvas context for rendering onto the HTML Canvas
	 */
	draw(ctx) {
		for (let i = 0; i < this.rigidBodies.length; i++) {
			this.rigidBodies[i].getShape().draw(ctx);
		}

		for (let i = 0; i < this.staticBodies.length; i++) {
			this.staticBodies[i].getShape().draw(ctx);
		}

		// for (let i = 0; i < this.particles.length; i++) {
		// 	this.particles[i].getShape().draw(ctx);
		// }

		// this.grid.draw();
	}

	/**
	 *
	 * @todo Implement function to allow for assigning to shapes to be controllable.
	 */

	pollMovement() {
		// this.controller.log();

		let length = this.rigidBodies.length;

		// Moving shape one
		if (this.controller.keys.KeyD) {
			this.rigidBodies[4].addForce(new Vector2(this.normalizedSpeed, 0));
		}
		if (this.controller.keys.KeyA) {
			this.rigidBodies[4].addForce(new Vector2(-this.normalizedSpeed, 0));
		}
		if (this.controller.keys.KeyS) {
			this.rigidBodies[4].addForce(new Vector2(0, this.normalizedSpeed));
		}
		if (this.controller.keys.KeyW) {
			this.rigidBodies[4].addForce(new Vector2(0, -this.normalizedSpeed));
		}
		if (this.controller.keys.Space) {
			this.rigidBodies[4].addForce(new Vector2(0, -this.normalizedSpeed * 10));
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

export { Simulation }