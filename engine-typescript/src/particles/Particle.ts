import type { Shape } from "@/shapes/Shape"
import { Vector2, scale } from "@/Vector2"

/**
 * A particle is the simplest object that can be simulated in the
 * physics system.
 */
class Particle {
	private shape: Shape
	private mass: number
	private velocity: Vector2
	private acceleration: Vector2
	private damping: number
	private inverseMass: number
	private forceAccumulator: Vector2

	constructor(shape: Shape, mass: number = 0) {
		/**
		 * The shape will contain the particle details
		 */
		this.shape = shape

		/**
		 * Mass to be used for gravity calculations
		 */
		this.mass = mass

		/**
		 * Linear velocity of the particle.
		 */
		this.velocity = new Vector2(0, 0)

		/**
		 * Acceleration of the particle. This value can be used
		 * to set acceleration due to gravity (its primary use) or
		 * any other constant acceleration.
		 */
		this.acceleration = new Vector2(0, 0)

		/**
		 * Holds the amount of damping applied to linear motion.
		 * Damping is required to remove energy added through
		 * numerical instability in the integrator.
		 */
		this.damping = 0

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
			this.inverseMass = 1.0 / mass
		} else {
			this.inverseMass = 0
		}

		/**
		 * Holds teh accumulated force to be applied at the next simulation
		 * integration only. This value is zeroed at each integration step.
		 */
		this.forceAccumulator = new Vector2(0, 0)
	}

	/**
	 * This should be called from the Simulation. This will trigger
	 * particle motion updates per time step.
	 * @param {number} deltaTime
	 */
	update(deltaTime: number): void {
		this.integrate(deltaTime)
	}

	/**
	 * Performs position, acceleration, drag and velocity integrations for updates.
	 * We will be using the Semi Implicit Euler method.
	 * This method has the best trade off for accuracy and efficiency.
	 * @param {number} deltaTime
	 */
	integrate(deltaTime: number): void {
		/**
		 * Updating acceleration using the following formula:
		 * new_acceleration = current_acceleration + force * inverse mass
		 */
		const resultingAcc = this.acceleration
		resultingAcc.addScaled(this.forceAccumulator, this.inverseMass)

		/**
		 * Updates the current velocity with the following formula:
		 * new_velocity = current_velocity + acceleration * time
		 */
		this.velocity.addScaled(resultingAcc, deltaTime)

		/**
		 * Updates the current position with the following formula:
		 * new_position = current_position + velocity * time
		 */
		this.shape.move(scale(this.velocity, deltaTime))

		// Impose drag
		this.velocity.scale(this.damping)

		// Clear forces
		this.clearAccumulator()
	}

	/**
	 * Adds the force vector to our force accumulator.
	 * @param {Vector2} force
	 */
	addForce(force: Vector2): void {
		this.forceAccumulator.add(force)
	}

	/**
	 * Accessor Methods
	 */

	/**
	 * Sets the current mass.
	 * @param {number} mass - Desired mass
	 */
	set setMass(mass: number) {
		this.mass = mass
	}

	/**
	 *
	 * @returns {number} Current mass
	 */
	get getMass() {
		return this.mass
	}

	/**
	 * Sets the current position.
	 * @param {number} x - Vector2.x position
	 * @param {number} y - Vector2.y position
	 */
	setPosition(x: number, y: number): void {
		this.shape.setCentroid(new Vector2(x, y))
	}

	/**
	 *
	 * @returns {Vector2} Current position
	 */
	getPosition(): Vector2 {
		return this.shape.getCentroid()
	}

	/**
	 * Sets the current velocity.
	 * @param {number} x - Vector2.x velocity
	 * @param {number} y - Vector2.y velocity
	 */
	setVelocity(x: number, y: number): void {
		this.velocity.x = x
		this.velocity.y = y
	}

	/**
	 *
	 * @returns {Vector2} Current velocity.
	 */
	getVelocity(): Vector2 {
		return this.velocity
	}

	/**
	 * Sets the current acceleration.
	 * @param {number} x - Vector2.x acceleration
	 * @param {number} y - Vector2.y acceleration
	 */
	setAcceleration(x: number, y: number): void {
		this.acceleration.x = x
		this.acceleration.y = y
	}

	/**
	 *
	 * @returns {Vector2} Current acceleration
	 */
	getAcceleration(): Vector2 {
		return this.acceleration
	}

	/**
	 * Sets the current damping.
	 * @param {number} damping - Desired damping value
	 */
	setDamping(damping: number): void {
		this.damping = damping
	}

	/**
	 *
	 * @returns {number} Current damping
	 */
	getDamping(): number {
		return this.damping
	}

	getShape(): Shape {
		return this.shape
	}

	/**
	 * Clears the force applied to the particle. This will be
	 * called automatically after each integration step.
	 */
	clearAccumulator(): void {
		this.forceAccumulator.x = 0
		this.forceAccumulator.y = 0
	}
}

export { Particle }
