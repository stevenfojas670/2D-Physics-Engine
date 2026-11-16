import type { Entity } from "@/ecs/Entity"
import type { World } from "@/ecs/World"
import { Collider } from "@/components/Collider"
import { CollisionGroup } from "@/components/CollisionGroup"
import { ForceJoint } from "@/components/ForceJoint"
import { SpringJoint } from "@/components/SpringJoint"
import { Transform } from "@/components/Transform"
import { transformCollider } from "@/shapes/colliderGeometry"
import type { CollisionGroup as CollisionGroupInfo } from "@/types/collisionGroups/collisionGroups.types"
import { wakeBodiesOverlapping, wakeBody } from "./wakeBodies"

const MISSING_SLOT = -1

function wakeAroundBody(world: World, entity: Entity): void {
	const colliders = world.store(Collider)
	const slot = colliders.slotOf(entity)
	if (slot === MISSING_SLOT) {
		return
	}
	wakeBodiesOverlapping(
		world,
		colliders.columns.minX[slot],
		colliders.columns.minY[slot],
		colliders.columns.maxX[slot],
		colliders.columns.maxY[slot],
	)
}

interface JointEnds {
	readonly entityA: ArrayLike<number>
	readonly entityB: ArrayLike<number>
}

function wakePartnersIn(
	world: World,
	entity: Entity,
	ends: JointEnds,
	jointCount: number,
): void {
	for (let slot = 0; slot < jointCount; slot++) {
		if (ends.entityA[slot] === entity) {
			wakeBody(world, ends.entityB[slot])
		} else if (ends.entityB[slot] === entity) {
			wakeBody(world, ends.entityA[slot])
		}
	}
}

function wakeJointPartners(world: World, entity: Entity): void {
	const springs = world.store(SpringJoint)
	const forceJoints = world.store(ForceJoint)
	wakePartnersIn(world, entity, springs.columns, springs.size)
	wakePartnersIn(world, entity, forceJoints.columns, forceJoints.size)
}

function destroyBody(world: World, entity: Entity): void {
	if (!world.isAlive(entity)) {
		return
	}
	wakeBody(world, entity)
	wakeAroundBody(world, entity)
	wakeJointPartners(world, entity)
	world.destroyEntity(entity)
}

function moveStaticBody(
	world: World,
	entity: Entity,
	x: number,
	y: number,
	angle: number,
): void {
	wakeAroundBody(world, entity)
	const transforms = world.store(Transform)
	const transformSlot = transforms.slotOf(entity)
	if (transformSlot === MISSING_SLOT) {
		return
	}
	transforms.columns.x[transformSlot] = x
	transforms.columns.y[transformSlot] = y
	transforms.columns.angle[transformSlot] = angle
	const colliders = world.store(Collider)
	const colliderSlot = colliders.slotOf(entity)
	if (colliderSlot !== MISSING_SLOT) {
		transformCollider(colliders.columns, colliderSlot, x, y, angle, true)
	}
	wakeAroundBody(world, entity)
}

function setCollisionGroup(
	world: World,
	entity: Entity,
	group: CollisionGroupInfo,
): void {
	world.add(entity, CollisionGroup, { group: group.id })
	wakeAroundBody(world, entity)
}

export { destroyBody, moveStaticBody, setCollisionGroup }
