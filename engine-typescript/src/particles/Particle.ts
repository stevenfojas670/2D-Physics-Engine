import type { Shape } from "@/shapes/Shape"
import { Vector2, scale } from "@/Vector2"

class Particle {
	static readonly NO_DAMPING = 1
	private shape: Shape
	private mass: number
	private velocity: Vector2
	private acceleration: Vector2
	private damping: number
	private inverseMass: number
	private forceAccumulator: Vector2

	constructor(shape: Shape, mass: number = 0) {
		this.shape = shape

		this.mass = mass

		this.velocity = new Vector2(0, 0)

		this.acceleration = new Vector2(0, 0)

		this.damping = Particle.NO_DAMPING

		if (mass > 0) {
			this.inverseMass = 1.0 / mass
		} else {
			this.inverseMass = 0
		}

		this.forceAccumulator = new Vector2(0, 0)
	}

	update(deltaTime: number): void {
		this.integrate(deltaTime)
	}

	integrate(deltaTime: number): void {
		const resultingAcc = this.acceleration.copy()
		resultingAcc.addScaled(this.forceAccumulator, this.inverseMass)

		this.velocity.addScaled(resultingAcc, deltaTime)

		this.shape.move(scale(this.velocity, deltaTime))

		this.velocity.scale(Math.pow(this.damping, deltaTime))

		this.clearAccumulator()
	}

	addForce(force: Vector2): void {
		this.forceAccumulator.add(force)
	}

	set setMass(mass: number) {
		this.mass = mass
	}

	get getMass() {
		return this.mass
	}

	setPosition(x: number, y: number): void {
		this.shape.setCentroid(new Vector2(x, y))
	}

	getPosition(): Vector2 {
		return this.shape.getCentroid()
	}

	setVelocity(x: number, y: number): void {
		this.velocity.x = x
		this.velocity.y = y
	}

	getVelocity(): Vector2 {
		return this.velocity
	}

	setAcceleration(x: number, y: number): void {
		this.acceleration.x = x
		this.acceleration.y = y
	}

	getAcceleration(): Vector2 {
		return this.acceleration
	}

	setDamping(damping: number): void {
		this.damping = damping
	}

	getDamping(): number {
		return this.damping
	}

	getShape(): Shape {
		return this.shape
	}

	clearAccumulator(): void {
		this.forceAccumulator.x = 0
		this.forceAccumulator.y = 0
	}
}

export { Particle }
