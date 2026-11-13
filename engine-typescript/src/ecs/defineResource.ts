interface ResourceKey<T> {
	readonly id: number
	readonly name: string
	readonly valueType?: T
}

let nextResourceId = 0

function defineResource<T>(name: string): ResourceKey<T> {
	const id = nextResourceId
	nextResourceId++
	return { id, name }
}

export type { ResourceKey }
export { defineResource }
