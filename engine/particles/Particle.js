/**
 * A particle is the simplest object that can be simulated in the
 * physics system.
 */
class Particle {
	constructor(_pos) {
		/**
		 * Linear position of the particle.
		 */
		this.position = new Vector2(_pos.x, _pos.y);

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
	}
}
