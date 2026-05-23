import "./style.css";

type UnitMoveState = "idle" | "preparing" | "moving";
const PREPARATION_MS = 1000;
const TRAVEL_SPEED = 3;

interface Unit {
  x: number;
  y: number;
  radius: number;
  selected: boolean;
  state: UnitMoveState;
  orderIssuedAt: number | null;
  target: { x: number; y: number } | null;
}

const canvas = document.getElementById("game")! as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

const unit: Unit = {
  x: 400,
  y: 300,
  radius: 30,
  selected: false,
  state: "idle",
  orderIssuedAt: null,
  target: null,
};

let aiming: boolean = false;
let potentialAim: boolean = false;
let aimEnd: { x: number; y: number } = { x: 0, y: 0 };

const draw = (): void => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.beginPath();
  ctx.arc(unit.x, unit.y, unit.radius, 0, Math.PI * 2);
  ctx.fillStyle = "red";
  ctx.fill();

  if (unit.selected) {
    ctx.strokeStyle = "brown";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  if (aiming) {
    const dx = aimEnd.x - unit.x;
    const dy = aimEnd.y - unit.y;
    const angle = Math.atan2(dy, dx);
    const headLen = 15;

    ctx.beginPath();
    ctx.moveTo(unit.x, unit.y);
    ctx.lineTo(aimEnd.x, aimEnd.y);
    // Two lines forming the arrowhead
    ctx.lineTo(
      aimEnd.x - headLen * Math.cos(angle - Math.PI / 6),
      aimEnd.y - headLen * Math.sin(angle - Math.PI / 6),
    );
    ctx.moveTo(aimEnd.x, aimEnd.y);
    ctx.lineTo(
      aimEnd.x - headLen * Math.cos(angle - Math.PI / 6),
      aimEnd.y - headLen * Math.sin(angle - Math.PI / 6),
    );
    ctx.moveTo(aimEnd.x, aimEnd.y);
    ctx.lineTo(
      aimEnd.x - headLen * Math.cos(angle + Math.PI / 6),
      aimEnd.y - headLen * Math.sin(angle + Math.PI / 6),
    );
    ctx.strokeStyle = "rgb(0 0 200/ 50%";
    ctx.lineWidth = 2;

    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = "rgb(0 0 200 / 50%)";
    ctx.arc(aimEnd.x, aimEnd.y, unit.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  if (unit.state === "preparing") {
    if (!unit?.target?.x || !unit?.target?.y) return;
    ctx.beginPath();
    ctx.fillStyle = "rgb(0 0 200 / 50%)";
    ctx.arc(unit.target.x, unit.target.y, unit.radius, 0, Math.PI * 2);
    ctx.fill();
  }
};

canvas.addEventListener("mousedown", (e) => {
  const dx = e.offsetX - unit.x;
  const dy = e.offsetY - unit.y;
  const clickedunit = dx * dx + dy * dy < unit.radius * unit.radius;

  if (unit.selected && !clickedunit) {
    // Already selected, clicking elsewhere → start aiming an arrow
    aiming = true;
    aimEnd = { x: e.offsetX, y: e.offsetY };
  } else if (clickedunit) {
    // Tap the unit → select it
    unit.selected = true;
  } else {
    // Clicked empty space with nothing selected → deselect
    unit.selected = false;
    potentialAim = true;
  }
});

canvas.addEventListener("mousemove", (e) => {
  if (aiming) {
    aimEnd = { x: e.offsetX, y: e.offsetY };
  }
});

canvas.addEventListener("mouseup", () => {
  if (aiming) {
    // Here's where you'd issue the order — e.g. set a move target
    // For now, just stop aiming
    unit.state = "preparing";
    unit.orderIssuedAt = Date.now();
    unit.target = { x: aimEnd.x, y: aimEnd.y };
    aiming = false;
  }
});

const loop = () => {
  if (unit.state === "preparing") {
    const timeNow = Date.now();
    if (unit.orderIssuedAt && timeNow - unit.orderIssuedAt > PREPARATION_MS) {
      unit.state = "moving";
      console.log("MOVING");
    }
  }

  if (unit.state === "moving") {
    if (!unit.target) return;
    const dx = unit.target.x - unit.x;
    const dy = unit.target.y - unit.y;

    const length = Math.sqrt(dx ** 2 + dy ** 2);

    if (length < TRAVEL_SPEED) {
      unit.state = "idle";
      unit.target = null;
    } else {
      unit.x += (dx / length) * TRAVEL_SPEED;
      unit.y += (dy / length) * TRAVEL_SPEED;
    }
  }

  draw();
  requestAnimationFrame(loop);
};

loop();
