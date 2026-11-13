import { describe, expect, test } from "vitest"
import { packEntity } from "@/ecs/Entity"
import { HashGrid } from "@/optimizations/broadPhase/HashGrid"
import { SpatialGrid } from "@/optimizations/broadPhase/SpatialGrid"
import { createBroadPhaseGrid } from "@/optimizations/broadPhase/createBroadPhaseGrid"
import type { BroadPhaseGrid } from "@/optimizations/broadPhase/BroadPhaseGrid"

const first = packEntity(0, 0)
const second = packEntity(1, 0)

function grids(): BroadPhaseGrid[] {
	const hash = new HashGrid(20)
	const spatial = new SpatialGrid(20)
	hash.resize(200, 200)
	spatial.resize(200, 200)
	return [hash, spatial]
}

describe("broad-phase grids", () => {
	test("an entity spanning cells is listed in each", () => {
		for (const grid of grids()) {
			grid.insert(first, 5, 5, 45, 25)
			const cells = grid.cellsOf(first)
			expect(cells.length).toBe(6)
			for (const cell of cells) {
				expect(grid.entitiesInCell(cell)).toContain(first)
			}
		}
	})

	test("cellAt matches the cell an entity was inserted into", () => {
		for (const grid of grids()) {
			grid.insert(first, 30, 30, 31, 31)
			expect(grid.cellsOf(first)).toEqual([grid.cellAt(30, 30)])
		}
	})

	test("hash grid pairs bodies at negative coordinates", () => {
		const grid = new HashGrid(20)
		grid.resize(200, 200)
		grid.insert(first, -35, -35, -25, -25)
		grid.insert(second, -30, -30, -20, -20)
		const shared = grid
			.cellsOf(first)
			.filter((cell) => grid.cellsOf(second).includes(cell))
		expect(shared.length).toBeGreaterThan(0)
		expect(grid.entitiesInCell(shared[0])).toEqual([first, second])
	})

	test("spatial grid clamps out-of-world bodies to edge cells", () => {
		const grid = new SpatialGrid(20)
		grid.resize(100, 100)
		grid.insert(first, -50, -50, -40, -40)
		grid.insert(second, 500, 500, 510, 510)
		expect(grid.cellsOf(first)).toEqual([0])
		expect(grid.cellsOf(second)).toEqual([24])
	})

	test("spatial grid reports its cells for drawing", () => {
		const grid = new SpatialGrid(20)
		grid.resize(50, 30)
		const cells: number[][] = []
		grid.forEachCellRect((x, y, size) => cells.push([x, y, size]))
		expect(cells.length).toBe(6)
		expect(cells[0]).toEqual([0, 0, 20])
	})

	test("clear empties cells without dropping later inserts", () => {
		for (const grid of grids()) {
			grid.insert(first, 10, 10, 12, 12)
			grid.clear()
			expect(grid.cellsOf(first)).toEqual([])
			grid.insert(second, 10, 10, 12, 12)
			expect(grid.entitiesInCell(grid.cellAt(11, 11))).toEqual([second])
		}
	})

	test("factory defaults to the hash grid", () => {
		expect(createBroadPhaseGrid("hash", 20)).toBeInstanceOf(HashGrid)
		expect(createBroadPhaseGrid("spatial", 20)).toBeInstanceOf(SpatialGrid)
	})
})
