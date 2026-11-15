import { defineResource } from "@/ecs/defineResource"

const INITIAL_PSEUDO_CAPACITY = 64

function grownCopy(values: Float64Array, capacity: number): Float64Array {
	const grown = new Float64Array(capacity)
	grown.set(values)
	return grown
}

class PseudoVelocities {
	x: Float64Array = new Float64Array(INITIAL_PSEUDO_CAPACITY)
	y: Float64Array = new Float64Array(INITIAL_PSEUDO_CAPACITY)
	angular: Float64Array = new Float64Array(INITIAL_PSEUDO_CAPACITY)

	ensureCapacity(count: number): void {
		if (count <= this.x.length) {
			return
		}
		let capacity = this.x.length
		while (capacity < count) {
			capacity *= 2
		}
		this.x = grownCopy(this.x, capacity)
		this.y = grownCopy(this.y, capacity)
		this.angular = grownCopy(this.angular, capacity)
	}

	clear(): void {
		this.x.fill(0)
		this.y.fill(0)
		this.angular.fill(0)
	}
}

const PseudoVelocitiesResource =
	defineResource<PseudoVelocities>("PseudoVelocities")

export { PseudoVelocities, PseudoVelocitiesResource }
