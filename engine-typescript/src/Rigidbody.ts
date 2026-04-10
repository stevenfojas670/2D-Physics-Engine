import { Vector2, Add, Sub, Scale } from "@/Vector2"
import { Shape } from "@/shapes/Shape"
import { Material } from "@/materials/Material"
import { CollisionGroups } from "@/optimizations/CollisionGroups"
import type { CollisionMask } from "@/types/collisionGroups/collisionGroups.type"
import type { CollisionGroup } from "@/types/collisionGroups/collisionGroups.type"

class Rigidbody {
	private shape: Shape
	private mass: number
	private isKinematic: boolean
	private invMass: number
	private forceAccumulator: Vector2
	private torqueAccumulator: number
	private velocity: Vector2
	private angularVelocity: number
	private material: Material
	private inertia: number
	private invInertia: number
	private linearSleepThreshold: number
	private angularSleepThreshold: number
	private collisionGroup: CollisionMask

	/**
	 * Create a rigidbody with a collision shape and mass.
	 *
	 * @param shape - The collision shape for this body.
	 * @param mass - The mass in kilograms. Use 0 for static bodies.
	 */
	constructor(shape: Shape, mass: number) {
		this.shape = shape
		this.mass = mass
		this.isKinematic = false

		if (mass > 0) {
			this.invMass = 1.0 / mass
		} else {
			// Accounts for mass being 0, since 1/0 is not allowed
			this.invMass = 0
			this.isKinematic = true
		}

		this.forceAccumulator = new Vector2(0, 0)
		this.torqueAccumulator = 0
		this.velocity = new Vector2(0, 0)
		this.angularVelocity = 0

		this.material = new Material()
		this.linearSleepThreshold = 0.01
		this.angularSleepThreshold = 0.01

		this.inertia = this.shape.calculateInertia(this.mass)
		// 0.00001 -> bias
		if (this.inertia > 0.00001) {
			this.invInertia = 1.0 / this.inertia
		} else {
			this.invInertia = 0
		}

		// Configuring Collision Masks and Groups
		this.collisionGroup = CollisionGroups.GROUP0.id
	}

	getKinematicFlag(): boolean {
		return this.isKinematic
	}

	/**
	 * Set the collision group for this rigidbody.
	 *
	 * @param group - The collision group to assign.
	 */
	setCollisionGroup(group: CollisionGroup): void {
		this.collisionGroup = group.id
	}

	getCollisionGroup(): number {
		return this.collisionGroup
	}

	getInverseInertia(): number {
		return this.invInertia
	}

	getInverseMass(): number {
		return this.invMass
	}

	/**
	 * Add a force that will be accumulated each frame.
	 *
	 * @param force - Force vector that will be applied to the current force.
	 * Initially, the starting force is a zero vector.
	 */
	addForce(force: Vector2): void {
		this.forceAccumulator.Add(force)
	}

	addForceAtPoint(atPoint: Vector2, force: Vector2): void {
		let direction = Sub(atPoint, this.shape.getCentroid()) // Direction from point to centroid
		this.forceAccumulator.Add(force)
		this.torqueAccumulator += direction.Cross(force)
		console.log(`Torque Accumulator: ${this.torqueAccumulator}`)
	}

	/**
	 * Add velocity to the rigidbody.
	 *
	 * @param velocity - Velocity vector that will be added to current velocity.
	 */
	addVelocity(velocity: Vector2): void {
		this.velocity.Add(velocity)
	}

	/**
	 * Get the current velocity of this rigidbody.
	 *
	 * @returns The velocity vector.
	 */
	getVelocity(): Vector2 {
		return this.velocity
	}

	/**
	 * Get the current angular velocity of this rigidbody.
	 *
	 * @returns The angular velocity.
	 */
	getAngularVelocity(): number {
		return this.angularVelocity
	}

	getMaterial(): Material {
		return this.material
	}

	getMass(): number {
		return this.mass
	}

	/**
	 * Set the velocity of this rigidbody.
	 *
	 * @param velocity - Velocity vector to set.
	 */
	setVelocity(velocity: Vector2): void {
		this.velocity = velocity.Cpy()
	}

	setMaterial(mat: Material): void {
		this.material = mat
	}

	setAngularVelocity(vel: number): void {
		this.angularVelocity = vel
	}

	update(deltaTime: number): void {
		this.integrate(deltaTime)
		this.log()
	}

	/**
	 * Integrate forces and velocities using the semi-implicit Euler method.
	 *
	 * Converts forces to acceleration, then acceleration to velocity,
	 * and velocity to position displacement. Includes velocity damping.
	 *
	 * @param deltaTime - Time step in seconds.
	 */
	integrate(deltaTime: number): void {
		this.semiImplicitEuler(deltaTime)
		// this.forwardEuler(deltaTime);
		// this.midPointMethod(deltaTime);
		// this.rungeKutta2(deltaTime);
		// this.rungeKutta4(deltaTime);

		// Adding a damper to simulate drag
		this.velocity.Scale(0.999)

		// Angular velocity damper
		this.angularVelocity *= 0.999

		if (
			this.velocity.Length2() <
			this.linearSleepThreshold * this.linearSleepThreshold
		) {
			this.velocity.x = 0
			this.velocity.y = 0
		}

		if (Math.abs(this.angularVelocity) < this.angularSleepThreshold) {
			this.angularVelocity = 0
		}

		this.forceAccumulator = new Vector2(0, 0)
		this.torqueAccumulator = 0
	}

	/**
	 * Semi-implicit Euler numerical integration method.
	 *
	 * Updates velocity first, then position. More stable than forward Euler.
	 * See: Game Coding Complete (4th Edition) - Page 570
	 *
	 * @param deltaTime - Time step in seconds.
	 */
	semiImplicitEuler(deltaTime: number): void {
		/**
		 * @description Calculating the acceleration created by a force (forceAccumulator).
		 * Acceleration = force * invMass (invMass = 1/mass) <=> force / mass
		 */
		let acceleration = Scale(this.forceAccumulator, this.invMass)

		/**
		 * @description Find a new velocity (this.velocity) from our current velocity (this.velocity),
		 * acceleration (acceleration), and time (deltaTime)
		 */
		this.velocity = Add(this.velocity, Scale(acceleration, deltaTime)) //v = v0 + at

		/**
		 * @description Find a new position (deltaPosition) from our current position (this.shape),
		 * velocity (this.velocity), and time (deltaTime).
		 * We will calculate the new position by moving our current shape by deltaPosition.
		 */
		let deltaPosition = Scale(this.velocity, deltaTime) // p = p0 + vt
		this.shape.move(deltaPosition)

		let rotationalAcceleration = this.torqueAccumulator * this.invInertia
		this.angularVelocity += rotationalAcceleration * deltaTime

		let deltaRotation = this.angularVelocity * deltaTime
		this.shape.rotate(deltaRotation)
	}

	/**
	 * Forward Euler numerical integration method.
	 *
	 * Updates position first, then velocity. Less stable than semi-implicit Euler.
	 *
	 * @param deltaTime - Time step in seconds.
	 */
	forwardEuler(deltaTime: number): void {
		let acceleration = Scale(this.forceAccumulator, this.invMass) // Calculated acceleration
		let deltaPosition = Scale(this.velocity, deltaTime) // calculated new position
		this.shape.move(deltaPosition) // Moved the shape to the new position
		this.velocity = Add(this.velocity, Scale(acceleration, deltaTime)) // Calculate the new velocity at the new position

		// let rotationalAcceleration = this.torqueAccumulator * this.invInertia;
		// this.angularVelocity += rotationalAcceleration * deltaTime;

		let deltaRotation = this.angularVelocity * deltaTime
		this.shape.rotate(deltaRotation)
	}

	/**
	 * Mid-point numerical integration method.
	 *
	 * @param deltaTime - Time step in seconds.
	 */
	midPointMethod(deltaTime: number): void {
		let acceleration = Scale(this.forceAccumulator, this.invMass)
		let halfAcceleration = Scale(acceleration, 0.5)
		this.velocity = Add(this.velocity, Scale(halfAcceleration, deltaTime))
		let deltaPosition = Scale(this.velocity, deltaTime)
		this.shape.move(deltaPosition)
		this.velocity = Add(this.velocity, Scale(halfAcceleration, deltaTime))

		// let rotationalAcceleration = this.torqueAccumulator * this.invInertia;
		// this.angularVelocity += rotationalAcceleration * deltaTime;

		let deltaRotation = this.angularVelocity * deltaTime
		this.shape.rotate(deltaRotation)
	}

	/**
	 * Runge-Kutta 2nd order numerical integration method.
	 *
	 * More accurate than Forward Euler but less accurate than RK4.
	 *
	 * @param deltaTime - Time step in seconds.
	 */
	rungeKutta2(deltaTime: number): void {
		let k1, k2

		const computeAcceleration = (force: Vector2, invMass: number) =>
			Scale(force, invMass)

		// Compute k1
		let acceleration = computeAcceleration(this.forceAccumulator, this.invMass)
		k1 = Scale(acceleration, deltaTime) // Computing velocity toward k1

		// Compute k2
		let tempForce = Add(this.forceAccumulator, Scale(k1, 0.5)) // Compute force (also a direction) half way toward k1
		acceleration = computeAcceleration(tempForce, this.invMass) // Needed for calculating next velocity
		k2 = Scale(acceleration, deltaTime) // Calculate the velocity toward k2 from the midpoint of k1

		this.velocity = Add(this.velocity, k2) // Calculate the direction toward k2 directly from our current velocity
		let deltaPosition = Scale(this.velocity, deltaTime) // p = p0 + vt
		this.shape.move(deltaPosition)

		// let rotationalAcceleration = this.torqueAccumulator * this.invInertia;
		// this.angularVelocity += rotationalAcceleration * deltaTime;

		let deltaRotation = this.angularVelocity * deltaTime
		this.shape.rotate(deltaRotation)
	}

	/**
	 * Runge-Kutta 4th order numerical integration method.
	 *
	 * The most accurate predictor of position and velocity compared to simpler methods.
	 *
	 * @param deltaTime - Time step in seconds.
	 */
	rungeKutta4(deltaTime: number): void {
		let k1, k2, k3, k4

		const computeAcceleration = (force: Vector2, invMass: number) =>
			Scale(force, invMass)

		// Compute k1
		let acceleration = computeAcceleration(this.forceAccumulator, this.invMass)
		k1 = Scale(acceleration, deltaTime) // New vector k1

		// Compute k2
		let tempForce = Add(this.forceAccumulator, Scale(k1, 0.5))
		acceleration = computeAcceleration(tempForce, this.invMass)
		k2 = Scale(acceleration, deltaTime)

		// Compute k3
		tempForce = Add(this.forceAccumulator, Scale(k2, 0.5))
		acceleration = computeAcceleration(tempForce, this.invMass)
		k3 = Scale(acceleration, deltaTime)

		// Compute k4
		tempForce = Add(this.forceAccumulator, k3)
		acceleration = computeAcceleration(tempForce, this.invMass)
		k4 = Scale(acceleration, deltaTime)

		// Combine ks to get new velocity
		// (k1 + 2xk2 + 2xk3 + k4) / 6
		let deltaVelocity = Scale(
			Add(Add(k1, Scale(k2, 2)), Add(Scale(k3, 2), k4)),
			1 / 6.0,
		)
		this.velocity = Add(this.velocity, deltaVelocity)

		let deltaPosition = Scale(this.velocity, deltaTime)
		this.shape.move(deltaPosition)

		let rotationalAcceleration = this.torqueAccumulator * this.invInertia
		this.angularVelocity += rotationalAcceleration * deltaTime

		let deltaRotation = this.angularVelocity * deltaTime
		this.shape.rotate(deltaRotation)
	}

	/**
	 * Get the shape of this rigidbody.
	 *
	 * @returns The collision shape.
	 */
	getShape(): Shape {
		return this.shape
	}

	/**
	 * Log the current state to the console.
	 */
	log(): void {
		console.log("Inertia: " + this.inertia)
		console.log(
			`Force: x = ${this.forceAccumulator.x}, y = ${this.forceAccumulator.y}\nVelocity: x = ${this.velocity.x}, y = ${this.velocity.y}`,
		)
	}
}

export { Rigidbody }
