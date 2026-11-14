import type { GridKind } from "@/types/grid/grid.types"
import type { BroadPhaseGrid } from "./BroadPhaseGrid"
import { HashGrid } from "./HashGrid"
import { SpatialGrid } from "./SpatialGrid"

function createBroadPhaseGrid(
	kind: GridKind,
	cellSize: number,
): BroadPhaseGrid {
	return kind === "spatial" ? new SpatialGrid(cellSize) : new HashGrid(cellSize)
}

export { createBroadPhaseGrid }
