import { describe, expect, test } from "vitest"
import { World } from "@/ecs/World"
import { Collider } from "@/components/Collider"
import { CollisionGroup } from "@/components/CollisionGroup"
import { ForceAccumulator } from "@/components/ForceAccumulator"
import { LinearDamping } from "@/components/LinearDamping"
import { Mass } from "@/components/Mass"
import { Material } from "@/components/Material"
import { Particle } from "@/components/Particle"
import { ParticleDamping } from "@/components/ParticleDamping"
import { Renderable } from "@/components/Renderable"
import { Sleep } from "@/components/Sleep"
import { Transform } from "@/components/Transform"
import { Velocity } from "@/components/Velocity"
import {
	spawnParticle,
	spawnRigidBody,
	spawnStaticBody,
} from "@/components/bodyFactories"
import { CollisionGroups } from "@/optimizations/CollisionGroups"
import { CollisionSettings } from "@/resources/CollisionSettings"
import {
	createCircleShape,
	createRectangleShape,
} from "@/shapes/colliderShapes"

describe("body factories", () => {
	test("dynamic body gets velocity, damping and sleep", () => {
		const world = new World()
		const body = spawnRigidBody(
			world,
			createRectangleShape(40, 40),
			300,
			420,
			1,
		)
		for (const component of [
			Velocity,
			ForceAccumulator,
			LinearDamping,
			Sleep,
		]) {
			expect(world.has(body, component)).toBe(true)
		}
		const transforms = world.store(Transform)
		const slot = transforms.slotOf(body)
		expect(transforms.columns.x[slot]).toBe(300)
		expect(transforms.columns.y[slot]).toBe(420)
		const masses = world.store(Mass)
		const massSlot = masses.slotOf(body)
		expect(masses.columns.inverseMass[massSlot]).toBe(1)
		expect(masses.columns.inertia[massSlot]).toBeCloseTo(266.6667, 3)
	})

	test("zero mass body is immovable and has no velocity", () => {
		const world = new World()
		const wall = spawnStaticBody(
			world,
			createRectangleShape(100, 400),
			300,
			300,
		)
		expect(world.has(wall, Velocity)).toBe(false)
		expect(world.has(wall, ForceAccumulator)).toBe(false)
		const masses = world.store(Mass)
		const slot = masses.slotOf(wall)
		expect(masses.columns.inverseMass[slot]).toBe(0)
		expect(masses.columns.inverseInertia[slot]).toBe(0)
	})

	test("rigid body defaults match the spec", () => {
		const world = new World()
		const body = spawnRigidBody(world, createCircleShape(10), 0, 0, 2)
		const slotIn = (component: Parameters<World["store"]>[0]) =>
			world.store(component).slotOf(body)
		expect(world.store(Material).columns.restitution[slotIn(Material)]).toBe(
			0.5,
		)
		expect(
			world.store(Material).columns.friction[slotIn(Material)],
		).toBeCloseTo(0.1)
		expect(
			world.store(LinearDamping).columns.linear[slotIn(LinearDamping)],
		).toBeCloseTo(0.999)
		expect(
			world.store(Sleep).columns.linearThreshold[slotIn(Sleep)],
		).toBeCloseTo(0.01)
		expect(
			world.store(CollisionGroup).columns.group[slotIn(CollisionGroup)],
		).toBe(CollisionGroups.GROUP0.id)
		expect(world.store(Renderable).columns.color[slotIn(Renderable)]).toBe(
			"black",
		)
	})

	test("collider bounds are placed at the spawn position", () => {
		const world = new World()
		const body = spawnRigidBody(world, createRectangleShape(40, 20), 100, 50, 1)
		const colliders = world.store(Collider)
		const slot = colliders.slotOf(body)
		expect(colliders.columns.minX[slot]).toBe(80)
		expect(colliders.columns.maxY[slot]).toBe(60)
	})

	test("options set group and colour", () => {
		const world = new World()
		const body = spawnRigidBody(world, createCircleShape(5), 0, 0, 1, {
			group: CollisionGroups.GROUP1,
			color: "red",
		})
		const groups = world.store(CollisionGroup)
		expect(groups.columns.group[groups.slotOf(body)]).toBe(
			CollisionGroups.GROUP1.id,
		)
		const renderables = world.store(Renderable)
		expect(renderables.columns.color[renderables.slotOf(body)]).toBe("red")
	})

	test("particle defaults to no damping", () => {
		const world = new World()
		const particle = spawnParticle(world, 1, 2, 1)
		expect(world.has(particle, Particle)).toBe(true)
		expect(world.has(particle, Collider)).toBe(false)
		const damping = world.store(ParticleDamping)
		expect(damping.columns.perSecond[damping.slotOf(particle)]).toBe(1)
	})
})

describe("CollisionSettings", () => {
	test("collision settings start allowing every group and are per world", () => {
		const first = new CollisionSettings()
		const second = new CollisionSettings()
		const groupOne = CollisionGroups.GROUP1
		const groupTwo = CollisionGroups.GROUP2
		expect(first.canCollide(groupOne.id, groupTwo.id)).toBe(true)
		first.disableCollision(groupOne, groupTwo)
		expect(first.canCollide(groupOne.id, groupTwo.id)).toBe(false)
		expect(first.canCollide(groupTwo.id, groupOne.id)).toBe(false)
		expect(second.canCollide(groupOne.id, groupTwo.id)).toBe(true)
		first.enableCollision(groupOne, groupTwo)
		expect(first.canCollide(groupOne.id, groupTwo.id)).toBe(true)
	})

	test("group names are per instance", () => {
		const settings = new CollisionSettings()
		settings.setGroupName(CollisionGroups.GROUP1, "Kinematic Objects")
		expect(settings.groupName(CollisionGroups.GROUP1)).toBe("Kinematic Objects")
		expect(new CollisionSettings().groupName(CollisionGroups.GROUP1)).toBe(
			"GROUP1",
		)
		expect(CollisionGroups.GROUP1.name).toBe("GROUP1")
	})
})
