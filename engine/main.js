var canvas = document.getElementById('myCanvas');
var ctx = canvas.getContext('2d');
var width = 1920;
var height = 1080;

let lastTime = performance.now();
let currentTime = 0;
let deltaTime = 0;

let mousePos = [0, 0];
let mouseDownLeft = false;
let mouseDownRight = false;

let simulation = new Simulation(new Vector2(canvas.width, canvas.height));

document.addEventListener('DOMContentLoaded', () => {
	/**SETTINGS: EVENT LISTENERS */
	const moveSpeed = document.querySelector('#movement-speed');

	moveSpeed.value = simulation.getMoveSpeed();

	moveSpeed?.addEventListener(
		'input',
		(evt) => {
			simulation.setMoveSpeed(evt.target.value);
			console.log(evt.target.value);
		},
		false
	);

	/**LOGGING: EVENT LISTENERS */

	// Calculating the mouse position in the canvas
	function getMousePos(canvas, evt) {
		var rect = canvas.getBoundingClientRect();
		return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
	}

	// Event listener for keys being pressed
	window.addEventListener(
		'keydown',
		(evt) => {
			simulation.controller.keyboard(evt.key, true);
		},
		false
	);

	window.addEventListener(
		'keyup',
		(evt) => {
			simulation.controller.keyboard(evt.key, false);
		},
		false
	);

	// Event listener for mouse position within the canvas
	canvas.addEventListener('mousemove', (evt) => {
		mouse = getMousePos(canvas, evt);
		mousePos = [mouse.x, mouse.y];

		//console.log(mousePos)
	});

	window.addEventListener('mousedown', (evt) => {
		if (evt.button === 0) mouseDownLeft = true;
		if (evt.button === 2) mouseDownRight = true;

		//console.log(mouseDownLeft)
	});

	window.addEventListener('mouseup', (evt) => {
		if (evt.button === 0) mouseDownLeft = false;
		if (evt.button === 2) mouseDownRight = false;

		//console.log(mouseDownLeft)
	});
});

mainLoop();

function updateSimulation(deltaTime) {
	simulation.update(deltaTime);
	Clear();
	simulation.draw(ctx);
}

function mainLoop() {
	window.requestAnimationFrame(mainLoop);

	currentTime = performance.now();
	deltaTime = (currentTime - lastTime) / 1000;
	updateSimulation(deltaTime);

	lastTime = currentTime;
}

function Clear() {
	ctx.fillStyle = 'rgb(240, 240, 240)';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
}
