import type { Grid } from "./Grid"
import { HashGrid } from "./HashGrid"
import { SpatialGrid } from "./SpatialGrid"
import type { GridKind } from "@/types/grid/grid.types"

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
