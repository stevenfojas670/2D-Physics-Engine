/**
 * Class for a force generator that can be asked to add a force
 * to one or more particles.
 */
class ParticleForceGenerator {
	constructor() {}

	/**
	 * This will be overloaded to calculate and update the force applied to
	 * a given particle.
	 * @param {Particle} _particle - Particle that requires a force added to it.
	 * @param {number} deltaTime - Time step
	 */
	updateForce(_particle, deltaTime) {}
}

/**
 * A force generator that applies a gravitational force. One instance can be used for
 * multiple particles.
 */
class ParticleGravity extends ParticleForceGenerator {
	/**
	 *
	 * @param {Vector2} _gravity
	 */
	constructor(_gravity) {
		/**
		 * Holds the acceleration due to gravity.
		 */
		this.gravity = _gravity;
	}

	/**
	 * Applies the gravitational force to the given particle.
	 * @param {Particle} _particle
	 * @param {number} deltaTime
	 */
	updateForce(_particle, deltaTime) {
		// Check that we do not have infinite mass.
		if (_particle.inverseMass == 0) return;

		// Apply the mass-scaled force to the particle.
		_particle.AddForce(this.gravity * _particle.getMass());
	}
}

class ParticleDrag extends ParticleForceGenerator {
	constructor(_k1, _k2) {
		this.k1 = _k1;
		this.k2 = _k2;
	}

	/**
	 * Applies the drag force to the given particle
	 * @param {Particle} _particle
	 * @param {number} deltaTime
	 */
	updateForce(_particle, deltaTime) {
		let force = _particle.getVelocity();

		// Calculate the total drag coefficient.
		let dragCoeff = force.Length();
		dragCoeff = this.k1 * dragCoeff + this.k2 * dragCoeff * dragCoeff;

		// Calculate the final force and apply it.
		force.Normalize();
		force.Scale(-dragCoeff);
		_particle.AddForce(force);
	}
}

/**
 * Keeps track of one force generator and the particle it applies to.
 */
class ParticleForceRegistration {
	/**
	 *
	 * @param {Particle} _particle
	 * @param {ParticleForceGenerator} _forceGenerator
	 */
	constructor(_particle, _forceGenerator) {
		this.particle = _particle;
		this.forceGenerator = _forceGenerator;
	}

	/**
	 *
	 * @returns {Particle} - Desired particle object.
	 */
	getParticle() {
		return this.particle;
	}
}

/**
 * Holds all the force generators and the particles they apply to.
 */
class ParticleForceRegistry {
	constructor() {
		/**
		 * Holds the list of registrations.
		 * @type {ParticleForceRegistration} - should store a list of
		 * ParticleForceRegistration objects.
		 * @example registrations.push(new ParticleForceRegistration(particle, force))
		 */
		this.registrations = [];
	}

	/**
	 * Registers the given force generator to apply to the given
	 * particle.
	 * @param {Particle} _particle
	 * @param {ParticleForceGenerator} _forceGenerator
	 */
	add(_particle, _forceGenerator) {
		this.registrations.push(
			new ParticleForceRegistration(_particle, _forceGenerator)
		);
	}

	/**
	 * Removes the given registered pair from the registry. If the pair
	 * is not registered, this method will have no effect.
	 * @param {Particle} _particle
	 * @param {ParticleForceGenerator} _forceGenerator
	 */
	remove(_particle, _forceGenerator) {
		this.registrations;
	}

	/**
	 * Clears all registrations from the registry. This will
	 * not delete the particles or the force generators themselves,
	 * just the records of their connection.
	 */
	clear() {}

	/**
	 * Calls all the force generators to update the forces of their
	 * corresponding particles.
	 * @param {number} deltaTime
	 */
	updateForces(deltaTime) {
		const length = this.registrations.length;
		for (let i = 0; i < length; i++) {
			this.registrations[i].forceGenerator.addForce(
				this.registrations[i].particle,
				deltaTime
			);
		}
	}
}
