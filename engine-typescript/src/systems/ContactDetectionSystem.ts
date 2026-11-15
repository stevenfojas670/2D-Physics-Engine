import type { Entity } from "@/ecs/Entity"
import type { System } from "@/ecs/Schedule"
import type { World } from "@/ecs/World"
import { Asleep } from "@/components/Asleep"
import { BodyColumns } from "@/collisionDetectionSystem/BodyColumns"
import { ContactManifold } from "@/collisionDetectionSystem/ContactManifold"
import { testCollision } from "@/collisionDetectionSystem/narrowPhase"
import {
	DEFAULT_FRICTION,
	DEFAULT_RESTITUTION,
} from "@/materials/materialDefaults"
import { CandidatePairsResource } from "@/resources/CandidatePairs"
import { ContactsResource } from "@/resources/ContactLog"
import {
	ContactManifolds,
	ContactManifoldsResource,
	MAX_MANIFOLD_POINTS,
} from "@/resources/ContactManifolds"
import { aabbOverlap } from "@/shapes/colliderGeometry"

const MISSING_SLOT = -1
const TOUCHING = 1

function createContactDetectionSystem(world: World): System {
	if (!world.hasResource(ContactManifoldsResource)) {
		world.setResource(ContactManifoldsResource, new ContactManifolds())
	}
	const bodies = new BodyColumns(world)
	const transforms = bodies.transforms
	const colliders = bodies.colliders
	const masses = bodies.masses
	const materials = bodies.materials
	const velocities = bodies.velocities
	const scratch = new ContactManifold()
	const asleep = world.store(Asleep)

	const movableMassSlot = (entity: Entity): number =>
		velocities.slotOf(entity) === MISSING_SLOT || asleep.has(entity)
			? MISSING_SLOT
			: masses.slotOf(entity)

	const inverseMassOf = (entity: Entity): number => {
		const slot = movableMassSlot(entity)
		return slot === MISSING_SLOT ? 0 : masses.columns.inverseMass[slot]
	}

	const inverseInertiaOf = (entity: Entity): number => {
		const slot = movableMassSlot(entity)
		return slot === MISSING_SLOT ? 0 : masses.columns.inverseInertia[slot]
	}

	const restitutionOf = (entity: Entity): number => {
		const slot = materials.slotOf(entity)
		return slot === MISSING_SLOT
			? DEFAULT_RESTITUTION
			: materials.columns.restitution[slot]
	}

	const frictionOf = (entity: Entity): number => {
		const slot = materials.slotOf(entity)
		return slot === MISSING_SLOT
			? DEFAULT_FRICTION
			: materials.columns.friction[slot]
	}

	const storeManifold = (
		manifolds: ContactManifolds,
		entityA: Entity,
		entityB: Entity,
		inverseMassA: number,
		inverseMassB: number,
		centerAX: number,
		centerAY: number,
		centerBX: number,
		centerBY: number,
	): void => {
		const manifold = manifolds.add(entityA, entityB)
		const columns = manifolds.columns
		columns.velocitySlotA[manifold] =
			inverseMassA > 0 ? velocities.slotOf(entityA) : MISSING_SLOT
		columns.velocitySlotB[manifold] =
			inverseMassB > 0 ? velocities.slotOf(entityB) : MISSING_SLOT
		columns.inverseMassA[manifold] = inverseMassA
		columns.inverseMassB[manifold] = inverseMassB
		columns.inverseInertiaA[manifold] = inverseInertiaOf(entityA)
		columns.inverseInertiaB[manifold] = inverseInertiaOf(entityB)
		columns.normalX[manifold] = scratch.normalX
		columns.normalY[manifold] = scratch.normalY
		columns.restitution[manifold] = Math.max(
			restitutionOf(entityA),
			restitutionOf(entityB),
		)
		columns.friction[manifold] = Math.sqrt(
			frictionOf(entityA) * frictionOf(entityB),
		)
		columns.pointCount[manifold] = scratch.pointCount
		const firstPoint = manifold * MAX_MANIFOLD_POINTS
		for (let index = 0; index < scratch.pointCount; index++) {
			const point = firstPoint + index
			const pointX = scratch.pointX[index]
			const pointY = scratch.pointY[index]
			columns.pointX[point] = pointX
			columns.pointY[point] = pointY
			columns.anchorAX[point] = pointX - centerAX
			columns.anchorAY[point] = pointY - centerAY
			columns.anchorBX[point] = pointX - centerBX
			columns.anchorBY[point] = pointY - centerBY
			columns.depth[point] = scratch.depth[index]
			columns.featureId[point] = scratch.featureId[index]
		}
		manifolds.inheritImpulses(manifold)
	}

	return () => {
		const pairs = world.resource(CandidatePairsResource)
		const contacts = world.resource(ContactsResource)
		const manifolds = world.resource(ContactManifoldsResource)
		contacts.clear()
		colliders.columns.touching.fill(0)
		manifolds.beginStep()
		for (let pair = 0; pair < pairs.count; pair++) {
			const entityA = pairs.entityA(pair)
			const entityB = pairs.entityB(pair)
			const colliderSlotA = colliders.slotOf(entityA)
			const colliderSlotB = colliders.slotOf(entityB)
			if (colliderSlotA === MISSING_SLOT || colliderSlotB === MISSING_SLOT) {
				continue
			}
			if (!aabbOverlap(colliders.columns, colliderSlotA, colliderSlotB)) {
				continue
			}
			colliders.columns.touching[colliderSlotA] = TOUCHING
			colliders.columns.touching[colliderSlotB] = TOUCHING
			const inverseMassA = inverseMassOf(entityA)
			const inverseMassB = inverseMassOf(entityB)
			if (inverseMassA === 0 && inverseMassB === 0) {
				continue
			}
			const transformSlotA = transforms.slotOf(entityA)
			const transformSlotB = transforms.slotOf(entityB)
			const centerAX = transforms.columns.x[transformSlotA]
			const centerAY = transforms.columns.y[transformSlotA]
			const centerBX = transforms.columns.x[transformSlotB]
			const centerBY = transforms.columns.y[transformSlotB]
			const hit = testCollision(
				colliders.columns,
				colliderSlotA,
				colliderSlotB,
				centerAX,
				centerAY,
				centerBX,
				centerBY,
				scratch,
			)
			if (!hit) {
				continue
			}
			storeManifold(
				manifolds,
				entityA,
				entityB,
				inverseMassA,
				inverseMassB,
				centerAX,
				centerAY,
				centerBX,
				centerBY,
			)
			for (let index = 0; index < scratch.pointCount; index++) {
				contacts.recordContact(
					scratch.pointX[index],
					scratch.pointY[index],
					scratch.normalX,
					scratch.normalY,
					scratch.depth[index],
				)
			}
		}
	}
}

export { createContactDetectionSystem }
