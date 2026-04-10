import type { ControllerKeys } from "./types/controller/controller.type"

/**
 * Handles keyboard input state for the simulation.
 *
 * Each supported keyboard code is tracked as a boolean flag that can be read
 * by the simulation when applying movement or interaction controls.
 */
class Controller {
	/**
	 * Keyboard state for every supported input key.
	 */
	public keys: ControllerKeys

	/**
	 * @param log - When true, immediately logs any active keys for debugging.
	 */
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

	/**
	 * Update the pressed state for a supported keyboard code.
	 *
	 * @param key - Browser keyboard event code.
	 * @param isPressed - Whether the key is currently pressed.
	 */
	keyboard(key: string, isPressed: boolean): void {
		if (key in this.keys) {
			this.keys[key as keyof ControllerKeys] = isPressed
		} else {
			console.warn(`Key ${key} is not defined.`)
		}
	}

	/**
	 * Log all currently active keys for debugging.
	 */
	log(): void {
		for (const key in this.keys) {
			if (this.keys[key as keyof ControllerKeys]) {
				console.log(key)
			}
		}
	}
}

export { Controller }
