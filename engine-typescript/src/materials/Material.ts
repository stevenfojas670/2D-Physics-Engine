/**
 * @property
 */
class Material {
	private restitution: number
	private friction: number

	constructor() {
		this.restitution = 0.5
		this.friction = 0.1
	}

	setRestituion(res: number): void {
		this.restitution = res
	}

	setFriction(friction: number): void {
		this.friction = friction
	}

	getFriction(): number {
		return this.friction
	}

	getRestitution(): number {
		return this.restitution
	}
}

export { Material }
