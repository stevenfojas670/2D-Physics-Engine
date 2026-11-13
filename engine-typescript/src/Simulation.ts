import { Vector2, scale, subtract } from "@/Vector2"
import { Controller } from "@/Controller"
import { RigidBody } from "@/RigidBody"
import { StaticBody } from "@/StaticBody"
import { Particle } from "@/particles/Particle"
import { Joint } from "@/joints/Joint"
import { Grid } from "@/optimizations/grids/Grid"
import { createGrid } from "@/optimizations/grids/GridFactory"
import type { GridKind } from "@/types/grid/grid.types"
import {
	CollisionGroups,
	CollisionMatrix,
} from "@/optimizations/CollisionGroups"
import { Rectangle } from "@/shapes/Rectangle"
import type { CollisionGroup } from "@/types/collisionGroups/collisionGroups.types"
import { Circle } from "@/shapes/Circle"
import { DrawUtils } from "@/utils/DrawUtils"
import { CollisionDetection } from "@/collisionDetectionSystem/CollisionDetection"

class Simulation {
	private static readonly BOUNDARY_THICKNESS = 50
	private force: number
	private gravity: Vector2
	private worldSize: Vector2
	private rigidBodies: Array<RigidBody>
	private staticBodies: Array<StaticBody>
	private particles: Array<Particle>
	private joints: Array<Joint>
	private grid: Grid
	private normalizedSpeed: number
	private moveSpeed: number
	private selectedRigidBody: RigidBody | null
	private selectedPosition: Vector2 | null
	private selectedAnchorId: number | null

	public controller: Controller

	constructor(
		worldSize: Vector2,
		force: number = 100,
		gridKind: GridKind = "hash",
		cellSize: number = 20,
	) {
		this.force = force
		this.moveSpeed = 5
		this.normalizedSpeed = this.moveSpeed * this.force
		this.gravity = new Vector2(0, 200)
		this.controller = new Controller()
		this.worldSize = worldSize
		this.rigidBodies = []
		this.staticBodies = []
		this.particles = []
		this.joints = []
		this.selectedRigidBody = null
		this.selectedPosition = null
		this.selectedAnchorId = null

		this.grid = createGrid(gridKind, cellSize)
		this.grid.initialize(this.worldSize, this.rigidBodies)

		this.createBoundary()
		const polygon = new Rectangle(new Vector2(300, 420), 40, 40)
		const polygonKinematic = new RigidBody(polygon, 1)
		this.rigidBodies.push(polygonKinematic)

		const staticPolygon = new Rectangle(new Vector2(300, 300), 100, 400)
		const staticBody = new RigidBody(staticPolygon, 0)
		this.rigidBodies.push(staticBody)

		const recA = new Rectangle(new Vector2(200, 200), 50, 100)
		const staticRectangle = new StaticBody(recA)
		this.staticBodies.push(staticRectangle)

		polygonKinematic.setCollisionGroup(CollisionGroups.GROUP1)

		CollisionGroups.GROUP1.name = "Kinematic Objects"
		CollisionGroups.GROUP2.name = "Static Objects"

		this.disableCollisionBetweenGroups(
			CollisionGroups.GROUP1,
			CollisionGroups.GROUP2,
		)
	}

	private createBoundaryBodies(): RigidBody[] {
		const boundaryThickness = Simulation.BOUNDARY_THICKNESS
		const halfThickness = boundaryThickness / 2

		return [
			new RigidBody(
				new Rectangle(
					new Vector2(this.worldSize.x / 2, -halfThickness),
					this.worldSize.x,
					boundaryThickness,
				),
				0,
			),
			new RigidBody(
				new Rectangle(
					new Vector2(this.worldSize.x / 2, this.worldSize.y + halfThickness),
					this.worldSize.x,
					boundaryThickness,
				),
				0,
			),
			new RigidBody(
				new Rectangle(
					new Vector2(-halfThickness, this.worldSize.y / 2),
					boundaryThickness,
					this.worldSize.y,
				),
				0,
			),
			new RigidBody(
				new Rectangle(
					new Vector2(this.worldSize.x + halfThickness, this.worldSize.y / 2),
					boundaryThickness,
					this.worldSize.y,
				),
				0,
			),
		]
	}

	canCollide(groupAId: number, groupBId: number): boolean {
		return (CollisionMatrix[groupAId] & groupBId) != 0
	}

	enableCollisionBetweenGroups(
		groupA: CollisionGroup,
		groupB: CollisionGroup,
	): void {
		CollisionMatrix[groupA.id] |= groupB.id
		CollisionMatrix[groupB.id] |= groupA.id
	}

	disableCollisionBetweenGroups(
		groupA: CollisionGroup,
		groupB: CollisionGroup,
	): void {
		CollisionMatrix[groupA.id] &= ~groupB.id
		CollisionMatrix[groupB.id] &= ~groupA.id
	}

	createStressTestPyramid(boxSize: number, iterations: number) {
		const topOffset = this.worldSize.y - iterations * boxSize

		for (let i = 0; i < iterations; i++) {
			for (let j = iterations; j >= iterations - i; j--) {
				const x = boxSize * i + j * (boxSize / 2)
				const y = boxSize * j
				this.rigidBodies.push(
					new RigidBody(
						new Circle(new Vector2(x, y + topOffset), boxSize / 2),
						1,
					),
				)
			}
		}
	}

	createBoundary(): void {
		this.rigidBodies.push(...this.createBoundaryBodies())
	}

	resizeWorld(worldSize: Vector2): void {
		this.worldSize = worldSize

		const boundaryBodies = this.createBoundaryBodies()
		for (let i = 0; i < boundaryBodies.length; i++) {
			if (i < this.rigidBodies.length) {
				this.rigidBodies[i] = boundaryBodies[i]
			} else {
				this.rigidBodies.push(boundaryBodies[i])
			}
		}

		this.grid.initialize(this.worldSize, this.rigidBodies)
	}

	spawnObject(object: string, mousePosition: Vector2): void {
		switch (object) {
			case "Rectangle":
				this.rigidBodies.push(
					new RigidBody(
						new Rectangle(
							new Vector2(mousePosition.x, mousePosition.y),
							100,
							50,
						),
						10,
					),
				)
				break
			case "Polygon":
				break
			case "Circle":
				this.rigidBodies.push(
					new RigidBody(
						new Circle(new Vector2(mousePosition.x, mousePosition.y), 50),
						10,
					),
				)
				break
		}
	}

	handleMouseObjectInteraction(
		mousePos: Vector2,
		mouseDownLeft: boolean,
	): void {
		if (mouseDownLeft) {
			const id = this.grid.getGridIdFromPosition(mousePos)
			const nearBodies = this.grid.getContentOfCell(id)
			for (let i = 0; i < nearBodies.length; i++) {
				const mouseInside = nearBodies[i].getShape().isPointInside(mousePos)

				if (mouseInside && this.selectedRigidBody === null) {
					this.selectedRigidBody = nearBodies[i]
					this.selectedPosition = mousePos.copy()
					const localPos = subtract(
						mousePos,
						nearBodies[i].getShape().getCentroid(),
					)

					this.selectedAnchorId = nearBodies[i]
						.getShape()
						.createAnchorPoint(localPos)
				}
			}
		} else {
			if (this.selectedRigidBody !== null && this.selectedAnchorId !== null) {
				this.selectedRigidBody.getShape().removeAnchor(this.selectedAnchorId)
			}

			this.selectedRigidBody = null
			this.selectedAnchorId = null
			this.selectedPosition = null
		}

		if (
			this.selectedRigidBody !== null &&
			this.selectedPosition !== null &&
			this.selectedAnchorId !== null
		) {
			const anchorPos = this.selectedRigidBody
				.getShape()
				.getAnchorPos(this.selectedAnchorId)
			if (anchorPos === undefined) {
				return
			}
			const force = subtract(mousePos, anchorPos)
			this.selectedRigidBody.addForceAtPoint(anchorPos, force)
			DrawUtils.drawLine(anchorPos, mousePos, "black")
		}
	}

	handleJoints(): void {
		for (let i = 0; i < this.joints.length; i++) {
			this.joints[i].draw()
			this.joints[i].updateConnectionA()
			this.joints[i].updateConnectionB()
		}
	}

	update(deltaTime: number, mousePos: Vector2, mouseDownLeft: boolean): void {
		this.handleMouseObjectInteraction(mousePos, mouseDownLeft)

		for (let i = 0; i < this.rigidBodies.length; i++) {
			this.rigidBodies[i].update(deltaTime)
			this.rigidBodies[i].getShape().boundingBox.collisionState = false

			this.rigidBodies[i].addForce(
				scale(this.gravity, this.rigidBodies[i].getMass()),
			)
		}

		for (let i = 0; i < this.particles.length; i++) {
			this.particles[i].update(deltaTime)
		}

		this.grid.refreshGrid()

		const iterationLimit = 25
		for (
			let solverIterations = 0;
			solverIterations < iterationLimit;
			solverIterations++
		) {
			for (let i = 0; i < this.rigidBodies.length; i++) {
				const rigA = this.rigidBodies[i]
				const neighborRigidBodies = this.grid.getNeighborRigidBodies(i, rigA)

				for (let j = 0; j < neighborRigidBodies.length; j++) {
					const rigB = neighborRigidBodies[j]

					if (
						this.canCollide(rigA.getCollisionGroup(), rigB.getCollisionGroup())
					) {
						const isCollidingWithBoundingBox = rigA
							.getShape()
							.boundingBox.intersect(rigB.getShape().boundingBox)

						if (!isCollidingWithBoundingBox) continue

						rigA.getShape().boundingBox.collisionState =
							isCollidingWithBoundingBox
						rigB.getShape().boundingBox.collisionState =
							isCollidingWithBoundingBox

						const collisionManifold = CollisionDetection.checkCollisions(
							rigA,
							rigB,
						)

						if (collisionManifold != null) {
							collisionManifold.positionalCorrection()
							collisionManifold.resolveCollision()
						}
					}
				}
			}
		}

		this.pollMovement()
	}

	draw(ctx: CanvasRenderingContext2D): void {
		for (let i = 0; i < this.rigidBodies.length; i++) {
			this.rigidBodies[i].getShape().draw(ctx)
		}

		for (let i = 0; i < this.staticBodies.length; i++) {
			this.staticBodies[i].getShape().draw(ctx)
		}
	}

	pollMovement(): void {
		if (this.controller.keys.KeyD) {
			this.rigidBodies[4].addForce(new Vector2(this.normalizedSpeed, 0))
		}
		if (this.controller.keys.KeyA) {
			this.rigidBodies[4].addForce(new Vector2(-this.normalizedSpeed, 0))
		}
		if (this.controller.keys.KeyS) {
			this.rigidBodies[4].addForce(new Vector2(0, this.normalizedSpeed))
		}
		if (this.controller.keys.KeyW) {
			this.rigidBodies[4].addForce(new Vector2(0, -this.normalizedSpeed))
		}
		if (this.controller.keys.Space) {
			this.rigidBodies[4].addForce(new Vector2(0, -this.normalizedSpeed * 10))
		}
	}

	setMoveSpeed(speed: number): void {
		this.moveSpeed = speed
	}

	getMoveSpeed(): number {
		return this.moveSpeed
	}
}

export { Simulation }
