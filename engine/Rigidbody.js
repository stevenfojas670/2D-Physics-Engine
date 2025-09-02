class Rigibody {
	/**
	 *
	 * @param {Shape} shape
	 * @param {number} mass
	 */
	constructor(shape, mass) {
		this.shape = shape;
		this.mass = mass;

		if (mass > 0) {
			this.invMass = 1 / mass;
		} else {
			this.mass = 0;
			this.invMass = 0;
		}

		this.forceAccumulator = new Vector2(0, 0);
		this.velocity = new Vector2(0, 0);
	}

	/**
	 *
	 * @param {Vector2} force - Force vector that will be applied
	 * to the current force.
	 * Initially, the starting force is a zero vector.
	 * @returns {void}
	 */
	addForce(force) {
		this.forceAccumulator.Add(force);
	}

	/**
	 *
	 * @param {Vector2} velocity - Velocity vector that will be added
	 * to current velocity.
	 * @returns {void}
	 */
	addVelocity(velocity) {
		this.velocity.Add(velocity);
	}

	/**
	 *
	 * @param {Vector2} velocity - Velocity vector that will be set to
	 * the current velocity.
	 * @returns {void}
	 */
	setVelocity(velocity) {
		this.velocity = velocity.Cpy();
	}

	update(deltaTime) {
		this.integrate(deltaTime);
	}

	/**
	 * @description Converting the force from the force acummulator to
	 * an acceleration then we convert the acceleration to a velocity then
	 * we convert the velocity to a direction vector for movement.
	 * See: Game Coding Complete (4th Edition) - Page 570
	 * @param {number} deltaTime
	 */
	integrate(deltaTime) {
		this.semiImplicitEuler(deltaTime);
	}

	/**
	 *
	 * @param {number} deltaTime - Time step
	 */
	semiImplicitEuler(deltaTime) {
		/**
		 * @description Calculating the acceleration created by a force (forceAccumulator).
		 * Acceleration = force * invMass (invMass = 1/mass) <=> force / mass
		 */
		let acceleration = Scale(this.forceAccumulator, this.invMass);

		/**
		 * @description Find a new velocity (this.velocity) from our current velocity (this.velocity),
		 * acceleration (acceleration), and time (deltaTime)
		 */
		this.velocity = Add(this.velocity, Scale(acceleration, deltaTime)); //v = v0 + at

		/**
		 * @description Find a new position (deltaPosition) from our current position (this.shape),
		 * velocity (this.velocity), and time (deltaTime).
		 * We will calculate the new position by moving our current shape by deltaPosition.
		 */
		let deltaPosition = Scale(this.velocity, deltaTime); // p = p0 + vt
		this.shape.move(deltaPosition);
	}

	/**
	 *
	 * @param {number} deltaTime - Time step
	 */
	forwardEuler(deltaTime) {
		let acceleration = Scale(this.forceAccumulator, this.invMass); // Calculated acceleration
		let deltaPosition = Scale(this.velocity, deltaTime); // calculated new position
		this.shape.move(deltaPosition); // Moved the shape to the new position
		this.velocity = Add(this.velocity, Scale(acceleration, deltaTime)); // Calculate the new velocity at the new position
	}

	/**
	 *
	 * @param {number} deltaTime - Time step
	 */
	midPointMethod(deltaTime) {
		let acceleration = Scale(this.forceAccumulator, this.invMass);
		let halfAcceleration = Scale(acceleration, 0.5);
		this.velocity = Add(this.velocity, Scale(halfAcceleration, deltaTime));
		let deltaPosition = Scale(this.velocity, deltaTime);
		this.shape.move(deltaPosition);
		this.velocity = Scale(this.velocity, Scale(halfAcceleration, deltaTime));
	}

	getShape() {
		return this.shape;
	}

	log() {
		console.log(
			`Force: x = ${this.forceAccumulator.x}, y = ${this.forceAccumulator.y}\nVelocity: x = ${this.velocity.x}, y = ${this.velocity.y}`
		);
	}
}
