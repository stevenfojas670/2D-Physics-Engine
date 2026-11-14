import type { Entity } from "@/ecs/Entity"
import { entityIndex } from "@/ecs/Entity"
import type { System } from "@/ecs/Schedule"
import type { World } from "@/ecs/World"
import { Collider } from "@/components/Collider"
import { Transform } from "@/components/Transform"
import { transformCollider } from "@/shapes/colliderGeometry"

function createColliderTransformSystem(world: World): System {
	const transforms = world.store(Transform).columns
	const colliders = world.store(Collider).columns
	const bodies = world.view([Transform, Collider])
	let lastAngles = new Float64Array(0)

	const growLastAngles = (capacity: number): void => {
		if (capacity <= lastAngles.length) {
			return
		}
		const grown = new Float64Array(
			Math.max(capacity, lastAngles.length * 2),
		).fill(Number.NaN)
		grown.set(lastAngles)
		lastAngles = grown
	}

	const updateCollider = (
		transformSlot: number,
		colliderSlot: number,
		entity: Entity,
	): void => {
		const index = entityIndex(entity)
		const angle = transforms.angle[transformSlot]
		const angleChanged = lastAngles[index] !== angle
		lastAngles[index] = angle
		transformCollider(
			colliders,
			colliderSlot,
			transforms.x[transformSlot],
			transforms.y[transformSlot],
			angle,
			angleChanged,
		)
		colliders.touching[colliderSlot] = 0
	}

	return () => {
		growLastAngles(world.entityCapacity)
		bodies.each(updateCollider)
	}
}

export { createColliderTransformSystem }
