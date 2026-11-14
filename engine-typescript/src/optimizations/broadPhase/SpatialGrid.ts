import type { Entity } from "@/ecs/Entity"
import { MathHelper } from "@/utils/MathHelper"
import { BroadPhaseGrid } from "./BroadPhaseGrid"
import type { CellRectVisitor } from "./BroadPhaseGrid"

const NO_ENTITIES: readonly Entity[] = []

class SpatialGrid extends BroadPhaseGrid {
	private cells: Entity[][]
	private cellCountX: number
	private cellCountY: number

	constructor(cellSize: number) {
		super(cellSize)
		this.cells = []
		this.cellCountX = 0
		this.cellCountY = 0
	}

	resize(width: number, height: number): void {
		this.cellCountX = Math.ceil(width / this.cellSize)
		this.cellCountY = Math.ceil(height / this.cellSize)
		this.clear()
		this.cells = Array.from(
			{ length: this.cellCountX * this.cellCountY },
			() => [],
		)
	}

	insert(
		entity: Entity,
		minX: number,
		minY: number,
		maxX: number,
		maxY: number,
	): void {
		const left = this.clampX(this.cellCoordinate(minX))
		const right = this.clampX(this.cellCoordinate(maxX))
		const top = this.clampY(this.cellCoordinate(minY))
		const bottom = this.clampY(this.cellCoordinate(maxY))
		for (let x = left; x <= right; x++) {
			for (let y = top; y <= bottom; y++) {
				const cell = x + y * this.cellCountX
				this.cells[cell].push(entity)
				this.recordCell(entity, cell)
			}
		}
	}

	entitiesInCell(cell: number): readonly Entity[] {
		return this.cells[cell] ?? NO_ENTITIES
	}

	cellAt(x: number, y: number): number {
		return this.cellCoordinate(x) + this.cellCoordinate(y) * this.cellCountX
	}

	forEachCellRect(visit: CellRectVisitor): void {
		for (let y = 0; y < this.cellCountY; y++) {
			for (let x = 0; x < this.cellCountX; x++) {
				visit(x * this.cellSize, y * this.cellSize, this.cellSize)
			}
		}
	}

	protected clearCells(): void {
		for (const cell of this.cells) {
			cell.length = 0
		}
	}

	private clampX(cellX: number): number {
		return MathHelper.clamp(cellX, 0, this.cellCountX - 1)
	}

	private clampY(cellY: number): number {
		return MathHelper.clamp(cellY, 0, this.cellCountY - 1)
	}
}

export { SpatialGrid }
