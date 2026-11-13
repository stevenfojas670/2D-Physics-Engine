export type CollisionGroup = {
	id: number
	name: string
}

export type CollisionMask = number

export type CollisionMatrix = Record<number, CollisionMask>
