const MANIFOLD_POINT_CAPACITY = 2

class ContactManifold {
	normalX = 0
	normalY = 0
	pointCount = 0
	readonly pointX = new Float64Array(MANIFOLD_POINT_CAPACITY)
	readonly pointY = new Float64Array(MANIFOLD_POINT_CAPACITY)
	readonly depth = new Float64Array(MANIFOLD_POINT_CAPACITY)
	readonly featureId = new Int32Array(MANIFOLD_POINT_CAPACITY)

	clear(): void {
		this.pointCount = 0
	}

	setNormal(normalX: number, normalY: number): void {
		this.normalX = normalX
		this.normalY = normalY
	}

	addPoint(
		pointX: number,
		pointY: number,
		depth: number,
		featureId: number,
	): void {
		const point = this.pointCount++
		this.pointX[point] = pointX
		this.pointY[point] = pointY
		this.depth[point] = depth
		this.featureId[point] = featureId
	}
}

export { ContactManifold, MANIFOLD_POINT_CAPACITY }
