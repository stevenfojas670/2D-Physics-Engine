import type { Entity } from "@/ecs/Entity"
import type { World } from "@/ecs/World"
import {
	DEFAULT_FRICTION,
	DEFAULT_RESTITUTION,
} from "@/materials/materialDefaults"
import { CollisionGroups } from "@/optimizations/CollisionGroups"
import { transformCollider } from "@/shapes/colliderGeometry"
import { colliderValues, shapeInertia } from "@/shapes/colliderShapes"
import type { ColliderShape } from "@/shapes/colliderShapes"
import type { CollisionGroup as CollisionGroupInfo } from "@/types/collisionGroups/collisionGroups.types"
import { Acceleration } from "./Acceleration"
import { Collider } from "./Collider"
import { CollisionGroup } from "./CollisionGroup"
import { ForceAccumulator } from "./ForceAccumulator"
import { LinearDamping } from "./LinearDamping"
import { Mass } from "./Mass"
import { Material } from "./Material"
import { Particle } from "./Particle"
import { ParticleDamping } from "./ParticleDamping"
import { Renderable } from "./Renderable"
import { Sleep } from "./Sleep"
import { Transform } from "./Transform"
import { Velocity } from "./Velocity"

const MINIMUM_INVERTIBLE_INERTIA = 0.00001
const DEFAULT_LINEAR_DAMPING = 0.999
const DEFAULT_ANGULAR_DAMPING = 0.999
const DEFAULT_SLEEP_THRESHOLD = 0.01
const DEFAULT_COLOR = "black"
const NO_PARTICLE_DAMPING = 1

interface BodyOptions {
	readonly group?: CollisionGroupInfo
	readonly color?: string
}

interface ParticleOptions {
	readonly damping?: number
	readonly accelerationX?: number
	readonly accelerationY?: number
}

function inverseOf(value: number, minimum: number): number {
	return value > minimum ? 1 / value : 0
}

function spawnRigidBody(
	world: World,
	shape: ColliderShape,
	x: number,
	y: number,
	mass: number,
	options: BodyOptions = {},
): Entity {
	const entity = world.createEntity()
	const isMovable = mass > 0
	const inertia = isMovable ? shapeInertia(shape, mass) : 0

	world.add(entity, Transform, { x, y, angle: 0 })
	const colliderSlot = world.add(entity, Collider, colliderValues(shape))
	transformCollider(world.store(Collider).columns, colliderSlot, x, y, 0, true)
	world.add(entity, CollisionGroup, {
		group: (options.group ?? CollisionGroups.GROUP0).id,
	})
	world.add(entity, Material, {
		restitution: DEFAULT_RESTITUTION,
		friction: DEFAULT_FRICTION,
	})
	world.add(entity, Renderable, { color: options.color ?? DEFAULT_COLOR })
	world.add(entity, Mass, {
		mass,
		inverseMass: isMovable ? 1 / mass : 0,
		inertia,
		inverseInertia: inverseOf(inertia, MINIMUM_INVERTIBLE_INERTIA),
	})

	if (isMovable) {
		world.add(entity, Velocity)
		world.add(entity, ForceAccumulator)
		world.add(entity, LinearDamping, {
			linear: DEFAULT_LINEAR_DAMPING,
			angular: DEFAULT_ANGULAR_DAMPING,
		})
		world.add(entity, Sleep, {
			linearThreshold: DEFAULT_SLEEP_THRESHOLD,
			angularThreshold: DEFAULT_SLEEP_THRESHOLD,
		})
	}
	return entity
}

function spawnStaticBody(
	world: World,
	shape: ColliderShape,
	x: number,
	y: number,
	options: BodyOptions = {},
): Entity {
	return spawnRigidBody(world, shape, x, y, 0, options)
}

function spawnParticle(
	world: World,
	x: number,
	y: number,
	mass: number,
	options: ParticleOptions = {},
): Entity {
	const entity = world.createEntity()
	world.add(entity, Transform, { x, y, angle: 0 })
	world.add(entity, Velocity)
	world.add(entity, ForceAccumulator)
	world.add(entity, Mass, {
		mass,
		inverseMass: mass > 0 ? 1 / mass : 0,
		inertia: 0,
		inverseInertia: 0,
	})
	world.add(entity, Particle)
	world.add(entity, Acceleration, {
		x: options.accelerationX ?? 0,
		y: options.accelerationY ?? 0,
	})
	world.add(entity, ParticleDamping, {
		perSecond: options.damping ?? NO_PARTICLE_DAMPING,
	})
	return entity
}

export type { BodyOptions, ParticleOptions }
export { spawnRigidBody, spawnStaticBody, spawnParticle }
