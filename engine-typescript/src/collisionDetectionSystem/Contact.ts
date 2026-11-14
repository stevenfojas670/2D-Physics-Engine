class Contact {
	depth: number
	normalX: number
	normalY: number
	pointX: number
	pointY: number

	constructor() {
		this.depth = 0
		this.normalX = 0
		this.normalY = 0
		this.pointX = 0
		this.pointY = 0
	}

	set(
		depth: number,
		normalX: number,
		normalY: number,
		pointX: number,
		pointY: number,
	): void {
		this.depth = depth
		this.normalX = normalX
		this.normalY = normalY
		this.pointX = pointX
		this.pointY = pointY
	}
}

export { Contact }
