import type { World } from "./World"

type System = (deltaTime: number) => void

class Schedule {
	private readonly systems: System[]

	constructor() {
		this.systems = []
	}

	add(system: System): this {
		this.systems.push(system)
		return this
	}

	run(world: World, deltaTime: number): void {
		for (const system of this.systems) {
			system(deltaTime)
			world.flushDeferred()
		}
	}
}

export type { System }
export { Schedule }
