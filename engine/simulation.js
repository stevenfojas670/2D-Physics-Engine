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
		/*
		DrawUtils.drawPoint(new Vector2(400, 400), 20, 'black');
		DrawUtils.strokePoint(new Vector2(400, 400), 20, 'blue');
		DrawUtils.drawLine(new Vector2(100, 100), new Vector2(500, 500), 'red');
		DrawUtils.drawText(new Vector2(600, 500), 50, 'black', 'Hello World');
		*/
		DrawUtils.drawArrow(
			new Vector2(200, 600),
			new Vector2(mousePos[0], mousePos[1]),
			'black'
		);
	}

	onKeyboardPressed(evt) {
		console.log(`Keyboard pressed: ${evt.keyCode}`);
	}
}
