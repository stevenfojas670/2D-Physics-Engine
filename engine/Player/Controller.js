/**
 * @property {Object} keys - Object storing all valid keyboard inputs.
 * @abstract Handles user input to move any objects. When keys are pressed,
 * their corresponding value in the keys object are set to true.
 */
class Controller {
	constructor(log = true) {
		this.keys = Object.seal({
			KeyW: false,
			KeyA: false,
			KeyS: false,
			KeyD: false,
			KeyQ: false,
			KeyE: false,
			Space: false,
		});

		if (log) this.log();
	}

	keyboard(key, isPressed) {
		if (key in this.keys) {
			this.keys[key] = isPressed;
		} else {
			console.warn(`Key ${key} is not defined.`);
		}
	}

	log() {
		for (let key in this.keys) {
			if (this.keys[key]) console.log(key);
		}
	}
}
