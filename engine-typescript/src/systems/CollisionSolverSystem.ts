import type { Entity } from "@/ecs/Entity"
import type { System } from "@/ecs/Schedule"
import type { World } from "@/ecs/World"
import { BodyColumns } from "@/collisionDetectionSystem/BodyColumns"
import { Contact } from "@/collisionDetectionSystem/Contact"
import {
	correctPositions,
	resolveImpulse,
} from "@/collisionDetectionSystem/contactResolution"
import { testCollision } from "@/collisionDetectionSystem/narrowPhase"
import { CandidatePairsResource } from "@/resources/CandidatePairs"
import type { ContactLog } from "@/resources/ContactLog"
import { ContactsResource } from "@/resources/ContactLog"
import { aabbOverlap } from "@/shapes/colliderGeometry"

const SOLVER_ITERATIONS = 25
const RECORDING_ITERATION = 0
const TOUCHING = 1

function createCollisionSolverSystem(world: World): System {
	const bodies = new BodyColumns(world)
	const transforms = bodies.transforms
	const colliders = bodies.colliders
	const masses = bodies.masses
	const contact = new Contact()

	const inverseMassOf = (entity: Entity): number => {
		const slot = masses.slotOf(entity)
		return slot === -1 ? 0 : masses.columns.inverseMass[slot]
	}

	const solvePair = (
		entityA: Entity,
		entityB: Entity,
		log: ContactLog | null,
	): void => {
		const colliderSlotA = colliders.slotOf(entityA)
		const colliderSlotB = colliders.slotOf(entityB)
		if (colliderSlotA === -1 || colliderSlotB === -1) {
			return
		}
		if (!aabbOverlap(colliders.columns, colliderSlotA, colliderSlotB)) {
			return
		}
		colliders.columns.touching[colliderSlotA] = TOUCHING
		colliders.columns.touching[colliderSlotB] = TOUCHING
		if (inverseMassOf(entityA) === 0 && inverseMassOf(entityB) === 0) {
			return
		}
		const transformSlotA = transforms.slotOf(entityA)
		const transformSlotB = transforms.slotOf(entityB)
		const hit = testCollision(
			colliders.columns,
			colliderSlotA,
			colliderSlotB,
			transforms.columns.x[transformSlotA],
			transforms.columns.y[transformSlotA],
			transforms.columns.x[transformSlotB],
			transforms.columns.y[transformSlotB],
			contact,
		)
		if (!hit) {
			return
		}
		if (log !== null) {
			log.recordContact(
				contact.pointX,
				contact.pointY,
				contact.normalX,
				contact.normalY,
				contact.depth,
			)
		}
		correctPositions(bodies, entityA, entityB, contact)
		resolveImpulse(bodies, entityA, entityB, contact, log)
	}

	return () => {
		const pairs = world.resource(CandidatePairsResource)
		const contacts = world.resource(ContactsResource)
		contacts.clear()
		for (let iteration = 0; iteration < SOLVER_ITERATIONS; iteration++) {
			const log = iteration === RECORDING_ITERATION ? contacts : null
			for (let pair = 0; pair < pairs.count; pair++) {
				solvePair(pairs.entityA(pair), pairs.entityB(pair), log)
			}
		}
	}
}

export { createCollisionSolverSystem }
