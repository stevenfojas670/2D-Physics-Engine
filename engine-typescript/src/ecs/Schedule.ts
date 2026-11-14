import type { World } from "./World"

type System = (deltaTime: number) => void
type Clock = () => number
type SystemTimed = (systemIndex: number, milliseconds: number) => void

class Schedule {
	private readonly systems: System[]
	private readonly systemNames: string[]

	constructor() {
		this.systems = []
		this.systemNames = []
	}

	get names(): readonly string[] {
		return this.systemNames
	}

	add(name: string, system: System): this {
		if (this.systemNames.includes(name)) {
			throw new Error(`Duplicate system name ${name}`)
		}
		this.systemNames.push(name)
		this.systems.push(system)
		return this
	}

	run(world: World, deltaTime: number): void {
		for (const system of this.systems) {
			system(deltaTime)
			world.flushDeferred()
		}
	}

	runTimed(
		world: World,
		deltaTime: number,
		clock: Clock,
		onSystemTimed: SystemTimed,
	): void {
		for (let index = 0; index < this.systems.length; index++) {
			const start = clock()
			this.systems[index](deltaTime)
			world.flushDeferred()
			onSystemTimed(index, clock() - start)
		}
	}
}

export type { Clock, System, SystemTimed }
export { Schedule }
