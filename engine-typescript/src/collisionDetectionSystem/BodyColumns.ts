import type { ComponentStore } from "@/ecs/ComponentStore"
import type { World } from "@/ecs/World"
import { Collider } from "@/components/Collider"
import { Mass } from "@/components/Mass"
import { Material } from "@/components/Material"
import { Transform } from "@/components/Transform"
import { Velocity } from "@/components/Velocity"
import type { ColliderSchema } from "@/shapes/colliderGeometry"

class BodyColumns {
	readonly transforms: ComponentStore<(typeof Transform)["schema"]>
	readonly velocities: ComponentStore<(typeof Velocity)["schema"]>
	readonly masses: ComponentStore<(typeof Mass)["schema"]>
	readonly materials: ComponentStore<(typeof Material)["schema"]>
	readonly colliders: ComponentStore<ColliderSchema>

	constructor(world: World) {
		this.transforms = world.store(Transform)
		this.velocities = world.store(Velocity)
		this.masses = world.store(Mass)
		this.materials = world.store(Material)
		this.colliders = world.store(Collider)
	}
}

export { BodyColumns }
