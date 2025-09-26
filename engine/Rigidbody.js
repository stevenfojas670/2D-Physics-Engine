class Rigidbody {
	/**
	 *
	 * @param {Shape} shape
	 * @param {number} mass
	 */
	constructor(shape, mass) {
		this.shape = shape;
		this.mass = mass;
		this.isKinematic = false;

		if (mass > 0) {
			this.invMass = 1.0 / mass;
		} else {
			// Accounts for mass being 0, since 1/0 is not allowed
			this.invMass = 0;
			this.isKinematic = true;
		}

		this.forceAccumulator = new Vector2(0, 0);
		this.torqueAccumulator = 0;
		this.velocity = new Vector2(0, 0);
		this.angularVelocity = 0;

		this.material = new Material();

		this.inertia = this.shape.calculateInertia(this.mass);
		// 0.00001 -> bias
		if (this.inertia > 0.00001) {
			this.invInertia = 1.0 / this.inertia;
		} else {
			this.invInertia = 0;
		}
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

	addForceAtPoint(atPoint, force) {
		let direction = Sub(atPoint, this.shape.centroid); // Direction from point to centroid
		this.forceAccumulator.Add(force);
		this.torqueAccumulator += direction.Cross(force);
		console.log(`Torque Accumulator: ${this.torqueAccumulator}`);
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
	 * @returns {number} velocity
	 */
	getVelocity() {
		return this.velocity;
	}

	/**
	 * @returns {number} angular velocity
	 */
	getAngularVelocity() {
		return this.angularVelocity;
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

		// this.log();
	}

	/**
	 *
	 * @param {number} deltaTime
	 * @description Converting the force from the force acummulator to
	 * an acceleration then we convert the acceleration to a velocity then
	 * we convert the velocity to a direction vector for movement.
	 * See: Game Coding Complete (4th Edition) - Page 570
	 */
	integrate(deltaTime) {
		// this.semiImplicitEuler(deltaTime);
		// this.forwardEuler(deltaTime);
		// this.midPointMethod(deltaTime);
		// this.rungeKutta2(deltaTime);
		this.rungeKutta4(deltaTime);

		this.velocity.Scale(0.999);
		this.angularVelocity *= 0.999;
		this.forceAccumulator = new Vector2(0, 0);
		this.torqueAccumulator = 0;
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

		let rotationalAcceleration = this.torqueAccumulator * this.invInertia;
		this.angularVelocity += rotationalAcceleration * deltaTime;

		let deltaRotation = this.angularVelocity * deltaTime;
		this.shape.rotate(deltaRotation);
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

		let rotationalAcceleration = this.torqueAccumulator * this.invInertia;
		this.angularVelocity += rotationalAcceleration * deltaTime;

		let deltaRotation = this.angularVelocity * deltaTime;
		this.shape.rotate(deltaRotation);
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
		this.velocity = Add(this.velocity, Scale(halfAcceleration, deltaTime));

		let rotationalAcceleration = this.torqueAccumulator * this.invInertia;
		this.angularVelocity += rotationalAcceleration * deltaTime;

		let deltaRotation = this.angularVelocity * deltaTime;
		this.shape.rotate(deltaRotation);
	}

	/**
	 * @param {number} deltaTime - Time step
	 * @description RK2 positioning approximation function. This
	 * is more accurate than Forward Euler (FE) but less accurate than Rk4.
	 */
	rungeKutta2(deltaTime) {
		let k1, k2;

		const computeAcceleration = (force, invMass) => Scale(force, invMass);

		// Compute k1
		let acceleration = computeAcceleration(this.forceAccumulator, this.invMass);
		k1 = Scale(acceleration, deltaTime); // Computing velocity toward k1

		// Compute k2
		let tempForce = Add(this.forceAccumulator, Scale(k1, 0.5)); // Compute force (also a direction) half way toward k1
		acceleration = computeAcceleration(tempForce, this.invMass); // Needed for calculating next velocity
		k2 = Scale(acceleration, deltaTime); // Calculate the velocity toward k2 from the midpoint of k1

		this.velocity = Add(this.velocity, k2); // Calculate the direction toward k2 directly from our current velocity
		let deltaPosition = Scale(this.velocity, deltaTime); // p = p0 + vt
		this.shape.move(deltaPosition);

		let rotationalAcceleration = this.torqueAccumulator * this.invInertia;
		this.angularVelocity += rotationalAcceleration * deltaTime;

		let deltaRotation = this.angularVelocity * deltaTime;
		this.shape.rotate(deltaRotation);
	}

	/**
	 *
	 * @param {number} deltaTime - Time step
	 * @description RK4 positioning approximation function. This
	 * is a more accurate predictor of position and velocity than Euler's method.
	 */
	rungeKutta4(deltaTime) {
		let k1, k2, k3, k4;

		const computeAcceleration = (force, invMass) => Scale(force, invMass);

		// Compute k1
		let acceleration = computeAcceleration(this.forceAccumulator, this.invMass);
		k1 = Scale(acceleration, deltaTime); // New vector k1

		// Compute k2
		let tempForce = Add(this.forceAccumulator, Scale(k1, 0.5));
		acceleration = computeAcceleration(tempForce, this.invMass);
		k2 = Scale(acceleration, deltaTime);

		// Compute k3
		tempForce = Add(this.forceAccumulator, Scale(k2, 0.5));
		acceleration = computeAcceleration(tempForce, this.invMass);
		k3 = Scale(acceleration, deltaTime);

		// Compute k4
		tempForce = Add(this.forceAccumulator, k3);
		acceleration = computeAcceleration(tempForce, this.invMass);
		k4 = Scale(acceleration, deltaTime);

		// Combine ks to get new velocity
		// (k1 + 2xk2 + 2xk3 + k4) / 6
		let deltaVelocity = Scale(
			Add(Add(k1, Scale(k2, 2)), Add(Scale(k3, 2), k4)),
			1 / 6.0
		);
		this.velocity = Add(this.velocity, deltaVelocity);

		let deltaPosition = Scale(this.velocity, deltaTime);
		this.shape.move(deltaPosition);

		let rotationalAcceleration = this.torqueAccumulator * this.invInertia;
		this.angularVelocity += rotationalAcceleration * deltaTime;

		let deltaRotation = this.angularVelocity * deltaTime;
		this.shape.rotate(deltaRotation);
	}

	getShape() {
		return this.shape;
	}

	log() {
		console.log('Inertia: ' + this.inertia);
		console.log(
			`Force: x = ${this.forceAccumulator.x}, y = ${this.forceAccumulator.y}\nVelocity: x = ${this.velocity.x}, y = ${this.velocity.y}`
		);
	}
}
