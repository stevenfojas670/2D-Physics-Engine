import { entityIndex } from "@/ecs/Entity"
import type { Entity } from "@/ecs/Entity"

type CellRectVisitor = (x: number, y: number, size: number) => void

const NO_CELLS: readonly number[] = []

abstract class BroadPhaseGrid {
	protected readonly cellSize: number
	private readonly cellsByEntityIndex: number[][]
	private readonly entityIndicesWithCells: number[]

	constructor(cellSize: number) {
		this.cellSize = cellSize
		this.cellsByEntityIndex = []
		this.entityIndicesWithCells = []
	}

	abstract resize(width: number, height: number): void

	abstract insert(
		entity: Entity,
		minX: number,
		minY: number,
		maxX: number,
		maxY: number,
	): void

	abstract entitiesInCell(cell: number): readonly Entity[]

	abstract cellAt(x: number, y: number): number

	forEachCellRect?(visit: CellRectVisitor): void

	cellsOf(entity: Entity): readonly number[] {
		return this.cellsByEntityIndex[entityIndex(entity)] ?? NO_CELLS
	}

	clear(): void {
		for (const index of this.entityIndicesWithCells) {
			this.cellsByEntityIndex[index].length = 0
		}
		this.entityIndicesWithCells.length = 0
		this.clearCells()
	}

	protected abstract clearCells(): void

	protected recordCell(entity: Entity, cell: number): void {
		const index = entityIndex(entity)
		let cells = this.cellsByEntityIndex[index]
		if (cells === undefined) {
			cells = []
			this.cellsByEntityIndex[index] = cells
		}
		if (cells.length === 0) {
			this.entityIndicesWithCells.push(index)
		}
		cells.push(cell)
	}

	protected cellCoordinate(position: number): number {
		return Math.floor(position / this.cellSize)
	}
}

export type { CellRectVisitor }
export { BroadPhaseGrid }
