import type { RigidBody } from "@/RigidBody"
import type { Vector2 } from "@/Vector2"

abstract class Grid {
	protected cellSize: number

	protected worldSize!: Vector2

	protected rigidBodies!: RigidBody[]

	protected rigidBodiesToCells: number[][]

	constructor(cellSize: number) {
		this.cellSize = cellSize
		this.rigidBodiesToCells = []
	}

	initialize(worldSize: Vector2, rigidBodies: RigidBody[]): void {
		this.worldSize = worldSize
		this.rigidBodies = rigidBodies
		this.resetBodyCellMap()
		this.onInitialize()
	}

	refreshGrid(): void {
		this.clearGrid()
		this.resetBodyCellMap()
		this.mapBodiesToCells()
	}

	protected resetBodyCellMap(): void {
		this.rigidBodiesToCells = this.rigidBodies.map(() => [])
	}

	protected abstract onInitialize(): void

	protected abstract mapBodiesToCells(): void

	protected abstract clearGrid(): void

	abstract getContentOfCell(id: number): RigidBody[]

	abstract getGridIdFromPosition(pos: Vector2): number

	abstract getNeighborRigidBodies(
		rigIndex: number,
		rigidBody: RigidBody,
	): RigidBody[]

	draw?(ctx: CanvasRenderingContext2D): void
}

export { Grid }
