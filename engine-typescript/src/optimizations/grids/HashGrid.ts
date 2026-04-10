import type { Rigidbody } from "@/Rigidbody"
import type { Vector2 } from "@/Vector2"
import { Grid } from "./Grid"

/**
 * Sparse hashed broad-phase grid implementation.
 *
 * Instead of allocating every cell in the world up front, this grid hashes
 * integer cell coordinates into a map and stores only occupied cells.
 */
class HashGrid extends Grid {
	/**
	 * Sparse storage of occupied hash buckets mapped to rigidbody lists.
	 */
	private hashMap: Map<number, Rigidbody[]>

	/**
	 * Modulus used to constrain hashed cell coordinates to a bounded key space.
	 */
	private hashMapSize: number

	/**
	 * Prime used when mixing the x cell coordinate into the hash.
	 */
	private p1Prime: number

	/**
	 * Prime used when mixing the y cell coordinate into the hash.
	 */
	private p2Prime: number

	/**
	 * @param cellSize - Width and height of each logical grid cell in world units.
	 */
	constructor(cellSize: number) {
		super(cellSize)
		this.hashMap = new Map()
		this.hashMapSize = 10000
		this.p1Prime = 125311
		this.p2Prime = 588667
	}

	/**
	 * Prepare sparse storage for the currently attached simulation world.
	 */
	protected onInitialize(): void {
		this.hashMap.clear()
	}

	/**
	 * Insert all rigidbodies into every hashed cell touched by their current
	 * bounding box.
	 */
	protected mapBodiesToCells(): void {
		for (let i = 0; i < this.rigidBodies.length; i++) {
			let boundingBox = this.rigidBodies[i].getShape().boundingBox
			let left = boundingBox.topLeft.x
			let right = boundingBox.bottomRight.x
			let top = boundingBox.topLeft.y
			let bottom = boundingBox.bottomRight.y

			let leftCellIndex = Math.floor(left / this.cellSize)
			let rightCellIndex = Math.floor(right / this.cellSize)
			let topCellIndex = Math.floor(top / this.cellSize)
			let bottomCellIndex = Math.floor(bottom / this.cellSize)

			for (let x = leftCellIndex; x <= rightCellIndex; x++) {
				for (let y = topCellIndex; y <= bottomCellIndex; y++) {
					let hash = this.cellIndexToHash(x, y)
					let entries = this.hashMap.get(hash)

					if (entries == null) {
						this.hashMap.set(hash, [this.rigidBodies[i]])
					} else {
						entries.push(this.rigidBodies[i])
					}

					this.rigidBodiesToCells[i].push(hash)
				}
			}
		}
	}

	/**
	 * Clear all occupied hash buckets before rebuilding the sparse grid.
	 */
	protected clearGrid(): void {
		this.hashMap.clear()
	}

	/**
	 * Convert integer cell coordinates into a hashed bucket id.
	 *
	 * @param x - Cell coordinate on the x-axis.
	 * @param y - Cell coordinate on the y-axis.
	 * @returns Hashed cell id.
	 */
	private cellIndexToHash(x: number, y: number): number {
		return ((x * this.p1Prime) ^ (y * this.p2Prime)) % this.hashMapSize
	}

	/**
	 * Return the rigidbodies stored in the requested hash bucket.
	 *
	 * @param id - Hashed cell id.
	 * @returns All rigidbodies stored in the bucket, or an empty array if none exist.
	 */
	getContentOfCell(id: number): Rigidbody[] {
		return this.hashMap.get(id) ?? []
	}

	/**
	 * Convert a world-space position into a hashed cell id.
	 *
	 * @param pos - World-space position to look up.
	 * @returns Hash bucket id for the cell containing the provided position.
	 */
	getGridIdFromPosition(pos: Vector2): number {
		let x = Math.floor(pos.x / this.cellSize)
		let y = Math.floor(pos.y / this.cellSize)
		return this.cellIndexToHash(x, y)
	}

	/**
	 * Gather rigidbodies that share one or more hashed cells with the target body.
	 *
	 * @param rigIndex - Index of the rigidbody in the simulation's body array.
	 * @param rigidBody - Rigidbody whose potential neighbors should be returned.
	 * @returns Candidate nearby rigidbodies for broad-phase collision testing.
	 */
	getNeighborRigidBodies(rigIndex: number, rigidBody: Rigidbody): Rigidbody[] {
		let occupiedCells = this.rigidBodiesToCells[rigIndex]
		let neighborRigidBodies: Rigidbody[] = []

		for (let i = 0; i < occupiedCells.length; i++) {
			let cellHash = occupiedCells[i]
			let rigsInCell = this.hashMap.get(cellHash) ?? []

			for (let j = 0; j < rigsInCell.length; j++) {
				let rigInCell = rigsInCell[j]
				if (rigidBody !== rigInCell) {
					neighborRigidBodies.push(rigInCell)
				}
			}
		}

		return neighborRigidBodies
	}
}

export { HashGrid }
