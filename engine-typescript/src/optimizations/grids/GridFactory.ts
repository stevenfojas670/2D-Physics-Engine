import type { Grid } from "./Grid"
import { HashGrid } from "./HashGrid"
import { SpatialGrid } from "./SpatialGrid"
import type { GridKind } from "@/types/grid/grid.types"

/**
 * Create a grid implementation for the requested broad-phase strategy.
 *
 * @param kind - Grid strategy to instantiate.
 * @param cellSize - Width and height of each logical cell in world units.
 * @returns A concrete grid implementation matching the requested kind.
 */
function createGrid(kind: GridKind, cellSize: number): Grid {
	switch (kind) {
		case "spatial":
			return new SpatialGrid(cellSize)
		case "hash":
		default:
			return new HashGrid(cellSize)
	}
}

export { createGrid }
