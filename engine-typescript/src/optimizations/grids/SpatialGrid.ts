import type { Rigidbody } from "@/Rigidbody"
import { Vector2 } from "@/Vector2"
import MathHelper from "@/utils/MathHelpers"
import { DrawUtils } from "@/utils/DrawUtils"
import { Grid } from "./Grid"

/**
 * Dense uniform grid broad-phase implementation backed by a flat cell array.
 *
 * The world is divided into evenly sized cells. Each rigidbody is inserted into
 * every cell overlapped by its bounding box, allowing the simulation to query
 * candidate neighbors based on shared occupancy.
 */
class SpatialGrid extends Grid {
	/**
	 * Flattened 2D array of grid cells storing rigidbodies by cell index.
	 */
	private cells: Rigidbody[][]

	/**
	 * Number of cells spanning the world on the x-axis.
	 */
	private cellCountX: number

	/**
	 * Number of cells spanning the world on the y-axis.
	 */
	private cellCountY: number

	/**
	 * @param cellSize - Width and height of each grid cell in world units.
	 */
	constructor(cellSize: number) {
		super(cellSize)
		this.cells = []
		this.cellCountX = 0
		this.cellCountY = 0
	}

	/**
	 * Compute grid dimensions from the assigned world and allocate all cells.
	 */
	protected onInitialize(): void {
		this.cellCountX = Math.floor(this.worldSize.x / this.cellSize)
		this.cellCountY = Math.floor(this.worldSize.y / this.cellSize)

		/**
		 * worldSize.x = 850
		 * cellSize = 100
		 * cellCountX = 850 / 100 = 8.5
		 * We can't have a partial cell, so the grid expands to cover the
		 * remaining world space.
		 */
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

	/**
	 * Insert all rigidbodies into every dense-grid cell touched by their
	 * current bounding box.
	 */
	protected mapBodiesToCells(): void {
		for (let i = 0; i < this.rigidBodies.length; i++) {
			let boundingBox = this.rigidBodies[i].getShape().boundingBox
			let left = boundingBox.topLeft.x
			let right = boundingBox.bottomRight.x
			let top = boundingBox.topLeft.y
			let bottom = boundingBox.bottomRight.y

			let leftCellIndex = MathHelper.clamp(
				Math.floor(left / this.cellSize),
				0,
				this.cellCountX - 1,
			)
			let rightCellIndex = MathHelper.clamp(
				Math.floor(right / this.cellSize),
				0,
				this.cellCountX - 1,
			)
			let topCellIndex = MathHelper.clamp(
				Math.floor(top / this.cellSize),
				0,
				this.cellCountY - 1,
			)
			let bottomCellIndex = MathHelper.clamp(
				Math.floor(bottom / this.cellSize),
				0,
				this.cellCountY - 1,
			)

			for (let x = leftCellIndex; x <= rightCellIndex; x++) {
				for (let y = topCellIndex; y <= bottomCellIndex; y++) {
					let cellIndex = x + y * this.cellCountX
					this.cells[cellIndex].push(this.rigidBodies[i])
					this.rigidBodiesToCells[i].push(cellIndex)
				}
			}
		}
	}

	/**
	 * Clear all cell contents while preserving the dense-grid allocation.
	 */
	protected clearGrid(): void {
		for (let i = 0; i < this.cells.length; i++) {
			this.cells[i] = []
		}
	}

	/**
	 * Return the rigidbodies currently occupying the requested dense-grid cell.
	 *
	 * @param id - Flattened cell index.
	 * @returns The cell contents, or an empty array if the id is out of range.
	 */
	getContentOfCell(id: number): Rigidbody[] {
		return this.cells[id] ?? []
	}

	/**
	 * Convert a world-space position to the dense-grid cell index containing it.
	 *
	 * @param pos - World-space position to look up.
	 * @returns Flattened cell index for the provided position.
	 */
	getGridIdFromPosition(pos: Vector2): number {
		let x = Math.floor(pos.x / this.cellSize)
		let y = Math.floor(pos.y / this.cellSize)
		return x + y * this.cellCountX
	}

	/**
	 * Gather rigidbodies that share one or more occupied cells with the target body.
	 *
	 * @param rigIndex - Index of the rigidbody in the simulation's body array.
	 * @param rigidBody - Rigidbody whose potential neighbors should be returned.
	 * @returns Candidate nearby rigidbodies for broad-phase collision testing.
	 */
	getNeighborRigidBodies(rigIndex: number, rigidBody: Rigidbody): Rigidbody[] {
		let occupiedCells = this.rigidBodiesToCells[rigIndex]
		let neighborRigidBodies: Rigidbody[] = []

		for (let i = 0; i < occupiedCells.length; i++) {
			let occupiedCellIndex = occupiedCells[i]
			let cell = this.cells[occupiedCellIndex] ?? []
			for (let j = 0; j < cell.length; j++) {
				let rigInCell = cell[j]
				if (rigidBody !== rigInCell) {
					neighborRigidBodies.push(rigInCell)
				}
			}
		}

		return neighborRigidBodies
	}

	/**
	 * Draw the dense grid cell layout for debugging.
	 *
	 * @param ctx - Canvas rendering context. Present to satisfy the shared
	 * drawing contract; drawing uses the shared DrawUtils context.
	 */
	draw(ctx: CanvasRenderingContext2D): void {
		void ctx

		for (let x = 0; x < this.cellCountX; x++) {
			for (let y = 0; y < this.cellCountY; y++) {
				let position = new Vector2(x * this.cellSize + 5, y * this.cellSize + 5)
				DrawUtils.drawRect(
					position,
					new Vector2(this.cellSize - 5, this.cellSize - 5),
					"grey",
				)
			}
		}
	}

	/**
	 * Log the number of allocated dense-grid cells for debugging.
	 */
	log(): void {
		console.log(`${this.cells.length} cells instantiated.`)
	}
}

export { SpatialGrid }
