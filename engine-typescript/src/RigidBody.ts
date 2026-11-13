import { Vector2, add, subtract, scale } from "@/Vector2"
import { Shape } from "@/shapes/Shape"
import { Material } from "@/materials/Material"
import { CollisionGroups } from "@/optimizations/CollisionGroups"
import type { CollisionMask } from "@/types/collisionGroups/collisionGroups.types"
import type { CollisionGroup } from "@/types/collisionGroups/collisionGroups.types"

const minimumInvertibleInertia = 0.00001

class RigidBody {
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

	constructor(shape: Shape, mass: number) {
		this.shape = shape
		this.mass = mass
		this.isKinematic = false

		if (mass > 0) {
			this.invMass = 1.0 / mass
		} else {
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
		if (this.inertia > minimumInvertibleInertia) {
			this.invInertia = 1.0 / this.inertia
		} else {
			this.invInertia = 0
		}

		this.collisionGroup = CollisionGroups.GROUP0.id
	}

	getKinematicFlag(): boolean {
		return this.isKinematic
	}

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

	addForce(force: Vector2): void {
		this.forceAccumulator.add(force)
	}

	addForceAtPoint(atPoint: Vector2, force: Vector2): void {
		const direction = subtract(atPoint, this.shape.getCentroid())
		this.forceAccumulator.add(force)
		this.torqueAccumulator += direction.cross(force)
		console.log(`Torque Accumulator: ${this.torqueAccumulator}`)
	}

	addVelocity(velocity: Vector2): void {
		this.velocity.add(velocity)
	}

	getVelocity(): Vector2 {
		return this.velocity
	}

	getAngularVelocity(): number {
		return this.angularVelocity
	}

	getMaterial(): Material {
		return this.material
	}

	getMass(): number {
		return this.mass
	}

	setVelocity(velocity: Vector2): void {
		this.velocity = velocity.copy()
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

	integrate(deltaTime: number): void {
		this.semiImplicitEuler(deltaTime)

		this.velocity.scale(0.999)

		this.angularVelocity *= 0.999

		if (
			this.velocity.lengthSquared() <
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

	semiImplicitEuler(deltaTime: number): void {
		const acceleration = scale(this.forceAccumulator, this.invMass)

		this.velocity = add(this.velocity, scale(acceleration, deltaTime))

		const deltaPosition = scale(this.velocity, deltaTime)
		this.shape.move(deltaPosition)

		const rotationalAcceleration = this.torqueAccumulator * this.invInertia
		this.angularVelocity += rotationalAcceleration * deltaTime

		const deltaRotation = this.angularVelocity * deltaTime
		this.shape.rotate(deltaRotation)
	}

	forwardEuler(deltaTime: number): void {
		const acceleration = scale(this.forceAccumulator, this.invMass)
		const deltaPosition = scale(this.velocity, deltaTime)
		this.shape.move(deltaPosition)
		this.velocity = add(this.velocity, scale(acceleration, deltaTime))

		const deltaRotation = this.angularVelocity * deltaTime
		this.shape.rotate(deltaRotation)
	}

	midPointMethod(deltaTime: number): void {
		const acceleration = scale(this.forceAccumulator, this.invMass)
		const halfAcceleration = scale(acceleration, 0.5)
		this.velocity = add(this.velocity, scale(halfAcceleration, deltaTime))
		const deltaPosition = scale(this.velocity, deltaTime)
		this.shape.move(deltaPosition)
		this.velocity = add(this.velocity, scale(halfAcceleration, deltaTime))

		const deltaRotation = this.angularVelocity * deltaTime
		this.shape.rotate(deltaRotation)
	}

	rungeKutta2(deltaTime: number): void {
		const computeAcceleration = (force: Vector2, invMass: number) =>
			scale(force, invMass)

		let acceleration = computeAcceleration(this.forceAccumulator, this.invMass)
		const k1 = scale(acceleration, deltaTime)

		const tempForce = add(this.forceAccumulator, scale(k1, 0.5))
		acceleration = computeAcceleration(tempForce, this.invMass)
		const k2 = scale(acceleration, deltaTime)

		this.velocity = add(this.velocity, k2)
		const deltaPosition = scale(this.velocity, deltaTime)
		this.shape.move(deltaPosition)

		const deltaRotation = this.angularVelocity * deltaTime
		this.shape.rotate(deltaRotation)
	}

	rungeKutta4(deltaTime: number): void {
		const computeAcceleration = (force: Vector2, invMass: number) =>
			scale(force, invMass)

		let acceleration = computeAcceleration(this.forceAccumulator, this.invMass)
		const k1 = scale(acceleration, deltaTime)

		let tempForce = add(this.forceAccumulator, scale(k1, 0.5))
		acceleration = computeAcceleration(tempForce, this.invMass)
		const k2 = scale(acceleration, deltaTime)

		tempForce = add(this.forceAccumulator, scale(k2, 0.5))
		acceleration = computeAcceleration(tempForce, this.invMass)
		const k3 = scale(acceleration, deltaTime)

		tempForce = add(this.forceAccumulator, k3)
		acceleration = computeAcceleration(tempForce, this.invMass)
		const k4 = scale(acceleration, deltaTime)

		const deltaVelocity = scale(
			add(add(k1, scale(k2, 2)), add(scale(k3, 2), k4)),
			1 / 6.0,
		)
		this.velocity = add(this.velocity, deltaVelocity)

		const deltaPosition = scale(this.velocity, deltaTime)
		this.shape.move(deltaPosition)

		const rotationalAcceleration = this.torqueAccumulator * this.invInertia
		this.angularVelocity += rotationalAcceleration * deltaTime

		const deltaRotation = this.angularVelocity * deltaTime
		this.shape.rotate(deltaRotation)
	}

	getShape(): Shape {
		return this.shape
	}

	log(): void {
		console.log("Inertia: " + this.inertia)
		console.log(
			`Force: x = ${this.forceAccumulator.x}, y = ${this.forceAccumulator.y}\nVelocity: x = ${this.velocity.x}, y = ${this.velocity.y}`,
		)
	}
}

export { RigidBody }
