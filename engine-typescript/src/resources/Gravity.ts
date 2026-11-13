import { defineResource } from "@/ecs/defineResource"

interface Gravity {
	x: number
	y: number
}

const DEFAULT_GRAVITY: Readonly<Gravity> = { x: 0, y: 200 }

const GravityResource = defineResource<Gravity>("Gravity")

export type { Gravity }
export { DEFAULT_GRAVITY, GravityResource }
