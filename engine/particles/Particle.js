/**
 * A particle is the simplest object that can be simulated in the
 * physics system.
 */
class Particle {
	constructor(_shape, _mass = 0) {
		/**
		 * The shape will contain the particle details
		 */
		this.shape = _shape;

		/**
		 * Mass to be used for gravity calculations
		 */
		this.mass = _mass;

		/**
		 * Linear velocity of the particle.
		 */
		this.velocity = new Vector2(0, 0);

		/**
		 * Acceleration of the particle. This value can be used
		 * to set acceleration due to gravity (its primary use) or
		 * any other constant acceleration.
		 */
		this.acceleration = new Vector2(0, 0);

		/**
		 * Holds the amount of damping applied to linear motion.
		 * Damping is required to remove energy added through
		 * numerical instability in the integrator.
		 */
		this.damping = 0;

		/**
		 * @abstract is calculated with
		 * acc = 1/m * force
		 * If mass is 0, then we get a 0 divide error.
		 * In reality a mass of zero sort of means the object is
		 * immovable. Now we would like to be able to have an
		 * immovable object with dividing by zero. Thus, we'll
		 * address 1 / mass as inverseMass;
		 * We can just set inverseMass to 0, if we want an immovable
		 * object.
		 *
		 * @description Holds the inverse mass of a particle. It is
		 * more useful to hold the inverse mass because integration
		 * is simpler and because in real-time simulation it is more
		 * useful to have objects with infinite mass (immovable) than
		 * zero mass (completely unstable in numerical simulation).
		 */
		if (mass > 0) {
			this.inverseMass = 1.0 / _mass;
		} else {
			this.inverseMass = 0;
		}

		/**
		 * This for
		 */
		this.forceAccumulator = new Vector2(0, 0);
	}

	/**
	 * This should be called from the Simulation. This will trigger
	 * particle motion updates per time step.
	 * @param {number} deltaTime
	 */
	update(deltaTime) {
		this.integrate(deltaTime);
	}

	/**
	 * Performs position, acceleration, drag and velocity integrations for updates.
	 * We will be using the Semi Implicit Euler method.
	 * This method has the best trade off for accuracy and efficiency.
	 * @param {number} deltaTime
	 */
	integrate(deltaTime) {
		// Update position
		this.UpdatePosition(deltaTime);

		// Update the acceleration
		this.UpdateAcceleration(deltaTime);

		// Update velocities
		this.UpdateVelocity(deltaTime);

		// Impose drag
		this.velocity.Scale(this.damping);
	}

	/**
	 * Adds the force vector to our force accumulator.
	 * @param {Vector2} force
	 */
	AddForce(force) {
		this.forceAccumulator.Add(force);
	}

	/**
	 * Updating acceleration using the following formula:
	 * new_acceleration = current_acceleration + force * time
	 * @param {number} deltaTime
	 */
	UpdateAcceleration(deltaTime) {
		let resultingAcc = this.acceleration;
		resultingAcc.AddScaledVector(this.forceAccumulator, deltaTime);
	}

	/**
	 * Updates the current position with the following formula:
	 * new_position = current_position + velocity * time
	 * @param {number} deltaTime
	 */
	UpdatePosition(deltaTime) {
		this.shape.position.AddScaledVector(this.velocity, deltaTime);
	}

	/**
	 * Updates the current velocity with the following formula:
	 * new_velocity = current_velocity + acceleration * time
	 * @param {number} deltaTime
	 */
	UpdateVelocity(deltaTime) {
		this.velocity.AddScaledVector(this.acceleration, deltaTime);
	}

	/**
	 * Accessor Methods
	 */

	/**
	 * Sets the current mass.
	 * @param {number} _mass - Desired mass
	 */
	setMass(_mass) {
		this.mass = _mass;
	}

	/**
	 *
	 * @returns {number} Current mass
	 */
	getMass() {
		return this.mass;
	}

	/**
	 * Sets the current position.
	 * @param {number} _x - Vector2.x position
	 * @param {number} _y - Vector2.y position
	 */
	setPosition(_x, _y) {
		this.shape.x = _x;
		this.shape.y = _y;
	}

	/**
	 *
	 * @returns {Vector2} Current position
	 */
	getPosition() {
		return this.shape.position;
	}

	/**
	 * Sets the current velocity.
	 * @param {number} _x - Vector2.x velocity
	 * @param {number} _y - Vector2.y velocity
	 */
	setVelocity(_x, _y) {
		this.velocity.x = _x;
		this.velocity.y = _y;
	}

	/**
	 *
	 * @returns {Vector2} Current velocity.
	 */
	getVelocity() {
		return this.velocity;
	}

	/**
	 * Sets the current acceleration.
	 * @param {number} _x - Vector2.x acceleration
	 * @param {number} _y - Vector2.y acceleration
	 */
	setAcceleration(_x, _y) {
		this.acceleration.x = _x;
		this.acceleration.y = _y;
	}

	/**
	 *
	 * @returns {Vector2} Current acceleration
	 */
	getAcceleration() {
		return this.acceleration;
	}

	/**
	 * Sets the current damping.
	 * @param {number} _damping - Desired damping value
	 */
	setDamping(_damping) {
		this.damping = _damping;
	}

	/**
	 *
	 * @returns {number} Current damping
	 */
	getDamping() {
		return this.damping;
	}

	getShape() {
		return this.getShape;
	}

	/**
	 * Clears the current force accumulator
	 */
	clearAccumulator() {
		this.forceAccumulator.x = 0;
		this.forceAccumulator.y = 0;
	}
}
