class Simulation {
	constructor() {}

	// Splitting update and draw methods
	update(deltaTime) {
		console.log(`deltaTime: ${deltaTime}`);
		console.log(`MousePos x: ${mousePos[0]} y: ${mousePos[1]}`);
		console.log(
			`Mouse-left pressed: ${mouseDownLeft} - Mouse-right pressed: ${mouseDownRight}`
		);
	}

	draw(ctx) {
		ctx.beginPath();
		ctx.rect(20, 20, 50, 50);
		ctx.fillStyle = '#FF0000';
		ctx.fill();
		ctx.closePath();
	}

	onKeyboardPressed(evt) {
		console.log(`Keyboard pressed: ${evt.keyCode}`);
	}
}
