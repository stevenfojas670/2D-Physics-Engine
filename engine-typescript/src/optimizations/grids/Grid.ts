import type { Rigidbody } from "@/Rigidbody"
import type { Vector2 } from "@/Vector2"

/**
 * Base abstraction for broad-phase grid structures used by the simulation.
 *
 * Concrete grids are responsible for how bodies are stored and queried, while
 * this class owns the shared lifecycle and body-to-cell bookkeeping.
 */
abstract class Grid {
	/**
	 * Width and height of each logical cell in world units.
	 */
	protected cellSize: number

	/**
	 * Size of the world currently assigned to this grid.
	 */
	protected worldSize!: Vector2

	/**
	 * Active rigidbody list owned by the simulation.
	 *
	 * The grid reads from this list whenever it rebuilds its spatial index.
	 */
	protected rigidBodies!: Rigidbody[]

	/**
	 * Reverse lookup from rigidbody index to the grid cells it currently occupies.
	 *
	 * Each concrete grid decides what a "cell id" means, but this structure lets
	 * all implementations support neighbor queries using the same pattern.
	 */
	protected rigidBodiesToCells: number[][]

	/**
	 * @param cellSize - Width and height of each logical grid cell.
	 */
	constructor(cellSize: number) {
		this.cellSize = cellSize
		this.rigidBodiesToCells = []
	}

	/**
	 * Attach the grid to the active simulation world and body list.
	 *
	 * @param worldSize - Size of the simulated world.
	 * @param rigidBodies - Mutable rigidbody list managed by the simulation.
	 */
	initialize(worldSize: Vector2, rigidBodies: Rigidbody[]): void {
		this.worldSize = worldSize
		this.rigidBodies = rigidBodies
		this.resetBodyCellMap()
		this.onInitialize()
	}

	/**
	 * Rebuild the grid from the current rigidbody positions.
	 */
	refreshGrid(): void {
		this.clearGrid()
		this.resetBodyCellMap()
		this.mapBodiesToCells()
	}

	/**
	 * Reset the per-body reverse lookup used for neighbor queries.
	 */
	protected resetBodyCellMap(): void {
		this.rigidBodiesToCells = this.rigidBodies.map(() => [])
	}

	/**
	 * Perform implementation-specific setup after the grid is attached to a world.
	 *
	 * Subclasses should allocate storage and derive any metadata needed from
	 * {@link worldSize} and {@link rigidBodies}.
	 */
	protected abstract onInitialize(): void

	/**
	 * Insert every rigidbody into the cells overlapped by its current bounds.
	 *
	 * Implementations should also populate {@link rigidBodiesToCells} so that
	 * neighbor lookups can be performed efficiently.
	 */
	protected abstract mapBodiesToCells(): void

	/**
	 * Remove all stored cell contents without detaching the grid from the world.
	 *
	 * This is called before each rebuild in {@link refreshGrid}.
	 */
	protected abstract clearGrid(): void

	/**
	 * Get the rigidbodies currently stored in a single grid cell.
	 *
	 * @param id - Implementation-defined cell identifier.
	 * @returns All rigidbodies stored in the requested cell.
	 */
	abstract getContentOfCell(id: number): Rigidbody[]

	/**
	 * Convert a world-space position into an implementation-defined cell id.
	 *
	 * @param pos - World-space position to query.
	 * @returns The cell id containing the provided position.
	 */
	abstract getGridIdFromPosition(pos: Vector2): number

	/**
	 * Get candidate neighboring rigidbodies for a specific body.
	 *
	 * Implementations typically use {@link rigidBodiesToCells} to gather all
	 * bodies that share one or more cells with the requested rigidbody.
	 *
	 * @param rigIndex - Index of the rigidbody in {@link rigidBodies}.
	 * @param rigidBody - Rigidbody whose potential neighbors should be returned.
	 * @returns Candidate nearby rigidbodies for broad-phase collision testing.
	 */
	abstract getNeighborRigidBodies(
		rigIndex: number,
		rigidBody: Rigidbody,
	): Rigidbody[]

	/**
	 * Optional debug rendering hook for visualizing the grid.
	 *
	 * @param ctx - Canvas rendering context used for drawing.
	 */
	draw?(ctx: CanvasRenderingContext2D): void
}

export { Grid }
