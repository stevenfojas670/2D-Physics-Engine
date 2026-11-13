import type { RigidBody } from "@/RigidBody"
import { Vector2 } from "@/Vector2"
import { MathHelper } from "@/utils/MathHelper"
import { DrawUtils } from "@/utils/DrawUtils"
import { Grid } from "./Grid"

class SpatialGrid extends Grid {
	private cells: RigidBody[][]

	private cellCountX: number

	private cellCountY: number

	constructor(cellSize: number) {
		super(cellSize)
		this.cells = []
		this.cellCountX = 0
		this.cellCountY = 0
	}

	protected onInitialize(): void {
		this.cellCountX = Math.floor(this.worldSize.x / this.cellSize)
		this.cellCountY = Math.floor(this.worldSize.y / this.cellSize)

		if (this.cellSize * this.cellCountX < this.worldSize.x) {
			this.cellCountX++
		}
		if (this.cellSize * this.cellCountY < this.worldSize.y) {
			this.cellCountY++
		}

		this.cells = Array.from(
			{ length: this.cellCountX * this.cellCountY },
			() => [],
		)
	}

	protected mapBodiesToCells(): void {
		for (let i = 0; i < this.rigidBodies.length; i++) {
			const boundingBox = this.rigidBodies[i].getShape().boundingBox
			const left = boundingBox.topLeft.x
			const right = boundingBox.bottomRight.x
			const top = boundingBox.topLeft.y
			const bottom = boundingBox.bottomRight.y

			const leftCellIndex = MathHelper.clamp(
				Math.floor(left / this.cellSize),
				0,
				this.cellCountX - 1,
			)
			const rightCellIndex = MathHelper.clamp(
				Math.floor(right / this.cellSize),
				0,
				this.cellCountX - 1,
			)
			const topCellIndex = MathHelper.clamp(
				Math.floor(top / this.cellSize),
				0,
				this.cellCountY - 1,
			)
			const bottomCellIndex = MathHelper.clamp(
				Math.floor(bottom / this.cellSize),
				0,
				this.cellCountY - 1,
			)

			for (let x = leftCellIndex; x <= rightCellIndex; x++) {
				for (let y = topCellIndex; y <= bottomCellIndex; y++) {
					const cellIndex = x + y * this.cellCountX
					this.cells[cellIndex].push(this.rigidBodies[i])
					this.rigidBodiesToCells[i].push(cellIndex)
				}
			}
		}
	}

	protected clearGrid(): void {
		for (let i = 0; i < this.cells.length; i++) {
			this.cells[i] = []
		}
	}

	getContentOfCell(id: number): RigidBody[] {
		return this.cells[id] ?? []
	}

	getGridIdFromPosition(pos: Vector2): number {
		const x = Math.floor(pos.x / this.cellSize)
		const y = Math.floor(pos.y / this.cellSize)
		return x + y * this.cellCountX
	}

	getNeighborRigidBodies(rigIndex: number, rigidBody: RigidBody): RigidBody[] {
		const occupiedCells = this.rigidBodiesToCells[rigIndex]
		const neighborRigidBodies: RigidBody[] = []

		for (let i = 0; i < occupiedCells.length; i++) {
			const occupiedCellIndex = occupiedCells[i]
			const cell = this.cells[occupiedCellIndex] ?? []
			for (let j = 0; j < cell.length; j++) {
				const rigInCell = cell[j]
				if (rigidBody !== rigInCell) {
					neighborRigidBodies.push(rigInCell)
				}
			}
		}

		return neighborRigidBodies
	}

	draw(ctx: CanvasRenderingContext2D): void {
		void ctx

		for (let x = 0; x < this.cellCountX; x++) {
			for (let y = 0; y < this.cellCountY; y++) {
				const position = new Vector2(
					x * this.cellSize + 5,
					y * this.cellSize + 5,
				)
				DrawUtils.drawRect(
					position,
					new Vector2(this.cellSize - 5, this.cellSize - 5),
					"grey",
				)
			}
		}
	}

	log(): void {
		console.log(`${this.cells.length} cells instantiated.`)
	}
}

export { SpatialGrid }
