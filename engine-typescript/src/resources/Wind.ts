import { defineResource } from "@/ecs/defineResource"

interface Wind {
	x: number
	y: number
}

const DEFAULT_WIND: Readonly<Wind> = { x: 0, y: 0 }

const WindResource = defineResource<Wind>("Wind")

export type { Wind }
export { DEFAULT_WIND, WindResource }
