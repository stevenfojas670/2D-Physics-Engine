import type { RigidBody } from "@/RigidBody"
import type { Vector2 } from "@/Vector2"
import { Grid } from "./Grid"

class HashGrid extends Grid {
	private hashMap: Map<number, RigidBody[]>

	private hashMapSize: number

	private p1Prime: number

	private p2Prime: number

	constructor(cellSize: number) {
		super(cellSize)
		this.hashMap = new Map()
		this.hashMapSize = 10000
		this.p1Prime = 125311
		this.p2Prime = 588667
	}

	protected onInitialize(): void {
		this.hashMap.clear()
	}

	protected mapBodiesToCells(): void {
		for (let i = 0; i < this.rigidBodies.length; i++) {
			const boundingBox = this.rigidBodies[i].getShape().boundingBox
			const left = boundingBox.topLeft.x
			const right = boundingBox.bottomRight.x
			const top = boundingBox.topLeft.y
			const bottom = boundingBox.bottomRight.y

			const leftCellIndex = Math.floor(left / this.cellSize)
			const rightCellIndex = Math.floor(right / this.cellSize)
			const topCellIndex = Math.floor(top / this.cellSize)
			const bottomCellIndex = Math.floor(bottom / this.cellSize)

			for (let x = leftCellIndex; x <= rightCellIndex; x++) {
				for (let y = topCellIndex; y <= bottomCellIndex; y++) {
					const hash = this.cellIndexToHash(x, y)
					const entries = this.hashMap.get(hash)

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

	protected clearGrid(): void {
		this.hashMap.clear()
	}

	private cellIndexToHash(x: number, y: number): number {
		return ((x * this.p1Prime) ^ (y * this.p2Prime)) % this.hashMapSize
	}

	getContentOfCell(id: number): RigidBody[] {
		return this.hashMap.get(id) ?? []
	}

	getGridIdFromPosition(pos: Vector2): number {
		const x = Math.floor(pos.x / this.cellSize)
		const y = Math.floor(pos.y / this.cellSize)
		return this.cellIndexToHash(x, y)
	}

	getNeighborRigidBodies(rigIndex: number, rigidBody: RigidBody): RigidBody[] {
		const occupiedCells = this.rigidBodiesToCells[rigIndex]
		const neighborRigidBodies: RigidBody[] = []

		for (let i = 0; i < occupiedCells.length; i++) {
			const cellHash = occupiedCells[i]
			const rigsInCell = this.hashMap.get(cellHash) ?? []

			for (let j = 0; j < rigsInCell.length; j++) {
				const rigInCell = rigsInCell[j]
				if (rigidBody !== rigInCell) {
					neighborRigidBodies.push(rigInCell)
				}
			}
		}

		return neighborRigidBodies
	}
}

export { HashGrid }
