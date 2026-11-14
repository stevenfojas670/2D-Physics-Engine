import type { Entity } from "@/ecs/Entity"
import { BroadPhaseGrid } from "./BroadPhaseGrid"

const HASH_TABLE_SIZE = 10000
const HASH_PRIME_X = 125311
const HASH_PRIME_Y = 588667

const NO_ENTITIES: readonly Entity[] = []

class HashGrid extends BroadPhaseGrid {
	private readonly cells: Map<number, Entity[]>

	constructor(cellSize: number) {
		super(cellSize)
		this.cells = new Map()
	}

	resize(width: number, height: number): void {
		void width
		void height
		this.clear()
	}

	insert(
		entity: Entity,
		minX: number,
		minY: number,
		maxX: number,
		maxY: number,
	): void {
		const left = this.cellCoordinate(minX)
		const right = this.cellCoordinate(maxX)
		const top = this.cellCoordinate(minY)
		const bottom = this.cellCoordinate(maxY)
		for (let x = left; x <= right; x++) {
			for (let y = top; y <= bottom; y++) {
				const hash = this.hashCell(x, y)
				let entries = this.cells.get(hash)
				if (entries === undefined) {
					entries = []
					this.cells.set(hash, entries)
				}
				entries.push(entity)
				this.recordCell(entity, hash)
			}
		}
	}

	entitiesInCell(cell: number): readonly Entity[] {
		return this.cells.get(cell) ?? NO_ENTITIES
	}

	cellAt(x: number, y: number): number {
		return this.hashCell(this.cellCoordinate(x), this.cellCoordinate(y))
	}

	protected clearCells(): void {
		for (const entries of this.cells.values()) {
			entries.length = 0
		}
	}

	private hashCell(x: number, y: number): number {
		return ((x * HASH_PRIME_X) ^ (y * HASH_PRIME_Y)) % HASH_TABLE_SIZE
	}
}

export { HashGrid }
