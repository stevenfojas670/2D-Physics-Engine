class UnionFind {
	private parents = new Int32Array(0)
	private sizes = new Int32Array(0)

	reset(size: number): void {
		if (size > this.parents.length) {
			const capacity = Math.max(size, this.parents.length * 2)
			this.parents = new Int32Array(capacity)
			this.sizes = new Int32Array(capacity)
		}
		for (let index = 0; index < size; index++) {
			this.parents[index] = index
			this.sizes[index] = 1
		}
	}

	find(index: number): number {
		let root = index
		while (this.parents[root] !== root) {
			root = this.parents[root]
		}
		let current = index
		while (this.parents[current] !== root) {
			const next = this.parents[current]
			this.parents[current] = root
			current = next
		}
		return root
	}

	union(a: number, b: number): void {
		const rootA = this.find(a)
		const rootB = this.find(b)
		if (rootA === rootB) {
			return
		}
		if (this.sizes[rootA] < this.sizes[rootB]) {
			this.parents[rootA] = rootB
			this.sizes[rootB] += this.sizes[rootA]
		} else {
			this.parents[rootB] = rootA
			this.sizes[rootA] += this.sizes[rootB]
		}
	}
}

export { UnionFind }
