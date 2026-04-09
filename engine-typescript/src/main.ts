import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';

import { Vector2 } from '@/Vector2';
import { Simulation } from '@/Simulation';
import { DrawUtils } from '@/utils/DrawUtils';

const canvas = document.getElementById('myCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

DrawUtils.init(ctx);

let lastTime = performance.now();
let currentTime = 0;
let deltaTime = 0;

let mousePos = new Vector2(0, 0);
let mouseDownLeft = false;
let mouseDownRight = false;

let simulation = new Simulation(new Vector2(canvas.width, canvas.height));

document.addEventListener('DOMContentLoaded', () => {

  function getMousePos(canvas: HTMLCanvasElement, evt: MouseEvent) {
    var rect = canvas.getBoundingClientRect();
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
  }

  window.addEventListener('keydown', (evt: KeyboardEvent) => {
    simulation.controller.keyboard(evt.code, true);
  });

  window.addEventListener('keyup', (evt: KeyboardEvent) => {
    simulation.controller.keyboard(evt.code, false);
  });

  canvas.addEventListener('mousemove', (evt: MouseEvent) => {
    const mouse = getMousePos(canvas, evt);
    mousePos = new Vector2(mouse.x, mouse.y);
  });

  window.addEventListener('mousedown', (evt: MouseEvent) => {
    if (evt.button === 0) mouseDownLeft = true;
    if (evt.button === 2) mouseDownRight = true;
  });

  window.addEventListener('mouseup', (evt: MouseEvent) => {
    if (evt.button === 0) mouseDownLeft = false;
    if (evt.button === 2) mouseDownRight = false;
  });
});

mainLoop();

function updateSimulation(deltaTime: number) {
  clear();
  const fpsText = `${Math.round(1.0 / deltaTime)} FPS`;
  DrawUtils.drawText(new Vector2(10, 20), 12, 'black', fpsText);
  simulation.update(deltaTime);
  simulation.draw(ctx);
}

function mainLoop() {
  window.requestAnimationFrame(mainLoop);
  currentTime = performance.now();
  deltaTime = (currentTime - lastTime) / 1000;
  updateSimulation(deltaTime);
  lastTime = currentTime;
}

function clear() {
  ctx.fillStyle = 'rgb(240, 240, 240)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}