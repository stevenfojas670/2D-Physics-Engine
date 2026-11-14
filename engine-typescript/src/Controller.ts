import type { ControllerKeys } from "@/types/controller/controller.types"

class Controller {
	public keys: ControllerKeys

	constructor(log: boolean = true) {
		this.keys = Object.seal({
			KeyW: false,
			KeyA: false,
			KeyS: false,
			KeyD: false,
			KeyQ: false,
			KeyE: false,
			Space: false,
		})

		if (log) {
			this.log()
		}
	}

	keyboard(key: string, isPressed: boolean): void {
		if (key in this.keys) {
			this.keys[key as keyof ControllerKeys] = isPressed
		} else {
			console.warn(`Key ${key} is not defined.`)
		}
	}

	log(): void {
		for (const key in this.keys) {
			if (this.keys[key as keyof ControllerKeys]) {
				console.log(key)
			}
		}
	}
}

export { Controller }
