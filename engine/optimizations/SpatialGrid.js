/**
 * @todo Research more on spatial grids
 */
class SpatialGrid {
	constructor(cellSize) {
		this.cellSize = cellSize;
		this.cells = [];
		this.rigidBodiesToCells = [];
	}

	initialize(worldSize, rigidBodies) {
		this.worldSize = worldSize;
		this.rigidBodies = rigidBodies;

		this.cellCountX = parseInt(this.worldSize.x / this.cellSize);
		this.cellCountY = parseInt(this.worldSize.y / this.cellSize);

		/**
		 * worldSize.x = 850
		 * cellSize = 100
		 * cellCountX = 850 / 100 = 8.5
		 * We have a problem. We can't have half a cell, so we have to add a cell.
		 *
		 * Do the same for y as well.
		 */
		if (this.cellSize * this.cellCountX < this.worldSize.x) {
			this.cellCountX++;
		}
		if (this.cellSize * this.cellCountY < this.worldSize.y) {
			this.cellCountY++;
		}

		// Flattening the 2D array by filling this 1D array with a list to store each object
		for (let i = 0; i < this.cellCountX * this.cellCountY; i++) {
			this.cells[i] = [];
		}

		this.log();
	}

	refreshGrid() {
		this.clearGrid();
		this.mapBodiesToCell();

		let occupiedCells = 0;
		for (let i = 0; i < this.cellCountX * this.cellCountY; i++) {
			occupiedCells += this.cells[i].length;
		}
	}

	mapBodiesToCell() {
		for (let i = 0; i < this.rigidBodies.length; i++) {
			let boundingBox = this.rigidBodies[i].shape.boundingBox;
			let left = boundingBox.topLeft.x;
			let right = boundingBox.bottomRight.x;
			let top = boundingBox.topLeft.y;
			let bottom = boundingBox.bottomRight.y;

			let leftCellIndex = MathHelper.clamp(
				parseInt(left / this.cellSize),
				0,
				this.cellCountX - 1
			);
			let rightCellIndex = MathHelper.clamp(
				parseInt(right / this.cellSize),
				0,
				this.cellCountX - 1
			);
			let topCellIndex = MathHelper.clamp(
				parseInt(top / this.cellSize),
				0,
				this.cellCountY - 1
			);
			let bottomCellIndex = MathHelper.clamp(
				parseInt(bottom / this.cellSize),
				0,
				this.cellCountY - 1
			);

			for (let x = leftCellIndex; x <= rightCellIndex; x++) {
				for (let y = topCellIndex; y <= bottomCellIndex; y++) {
					let cellIndex = x + y * this.cellCountX;
					this.cells[cellIndex].push(this.rigidBodies[i]);
					this.rigidBodiesToCells[i].push(cellIndex);

					let position = new Vector2(
						x * this.cellSize + 5,
						y * this.cellSize + 5
					);
					DrawUtils.drawRect(
						position,
						new Vector2(this.cellSize - 5, this.cellSize - 5),
						'black'
					);
				}
			}
		}
	}

	clearGrid() {
		for (let i = 0; i < this.cellCountX * this.cellCountY; i++) {
			this.cells[i] = [];
		}
		this.rigidBodiesToCells = [];
		for (let i = 0; i < this.rigidBodies.length; i++) {
			this.rigidBodiesToCells[i] = [];
		}
	}

	getNeighborRigidBodies(rigIndex, rigidBody) {
		let occupiedCells = this.rigidBodiesToCells[rigIndex];
		let neighborRigidBodies = [];

		for (let i = 0; i < occupiedCells.length; i++) {
			let occupiedCellIndex = occupiedCells[i];
			let cell = this.cells[occupiedCellIndex];
			for (let j = 0; j < cell.length; j++) {
				let rigInCell = cell[j];
				if (rigidBody != rigInCell) {
					neighborRigidBodies.push(rigInCell);
				}
			}
		}

		return neighborRigidBodies;
	}

	draw() {
		for (let x = 0; x < this.cellCountX; x++) {
			for (let y = 0; y < this.cellCountY; y++) {
				let position = new Vector2(
					x * this.cellSize + 5,
					y * this.cellSize + 5
				);
				DrawUtils.drawRect(
					position,
					new Vector2(this.cellSize - 5, this.cellSize - 5),
					'grey'
				);
			}
		}
	}

	log() {
		console.log(`${this.cells.length} cells instantiated.`);
	}
}
