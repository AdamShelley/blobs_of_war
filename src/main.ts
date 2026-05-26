import "./style.css";

type UnitMoveState = "idle" | "preparing" | "moving";
const PREPARATION_MS = 500;
const TRAVEL_SPEED = 2.5;
const DRAG_BOUNDARY = 100;

interface Unit {
  x: number;
  y: number;
  radius: number;
  selected: boolean;
  state: UnitMoveState;
  orderIssuedAt: number | null;
  target: { x: number; y: number } | null;
  pendingTarget: { x: number; y: number } | null;
  facing: number;
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
  pendingTarget: null,
  facing: 0,
};

let aiming: boolean = false;
let potentialAim: boolean = false;
let aimEnd: { x: number; y: number } = { x: 0, y: 0 };
let mouseDown: { x: number; y: number } = { x: 0, y: 0 };
let squish = 0;
let currentSpeed = 0;

const size = 800;
const scale = window.devicePixelRatio;
canvas.width = Math.floor(size * scale);
canvas.height = Math.floor(size * scale);
canvas.style.width = size + "px";
canvas.style.height = size + "px";

// Normalize coordinate system to use CSS pixels.
ctx.scale(scale, scale);

const draw = (): void => {
  ctx.clearRect(0, 0, size, size);

  ctx.beginPath();
  if (unit.state === "moving") {
    ctx.ellipse(
      unit.x,
      unit.y,
      unit.radius - squish * 2,
      unit.radius + squish * 0.5,
      unit.facing,
      0,
      Math.PI * 2,
    );
  } else {
    ctx.arc(unit.x, unit.y, unit.radius, 0, Math.PI * 2);
  }

  ctx.fillStyle = "rgb(92, 42, 24)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(
    unit.x,
    unit.y,
    unit.radius + 4,
    unit.facing - Math.PI / 3,
    unit.facing + Math.PI / 3,
  );
  ctx.strokeStyle = "rgb(120, 120, 120)";
  ctx.stroke();

  if (unit.selected) {
    ctx.strokeStyle = "rgb(0, 0, 0)";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  if (aiming) {
    const headLen = 15;

    ctx.beginPath();
    const aimAngle = Math.atan2(aimEnd.y - unit.y, aimEnd.x - unit.x);
    const startX = unit.x + unit.radius * Math.cos(aimAngle);
    const startY = unit.y + unit.radius * Math.sin(aimAngle);
    ctx.moveTo(startX + 10, startY + 10);
    ctx.lineTo(aimEnd.x, aimEnd.y);
    // Two lines forming the arrowhead
    ctx.lineTo(
      aimEnd.x - headLen * Math.cos(unit.facing - Math.PI / 6),
      aimEnd.y - headLen * Math.sin(unit.facing - Math.PI / 6),
    );
    ctx.moveTo(aimEnd.x, aimEnd.y);
    ctx.lineTo(
      aimEnd.x - headLen * Math.cos(unit.facing - Math.PI / 6),
      aimEnd.y - headLen * Math.sin(unit.facing - Math.PI / 6),
    );
    ctx.moveTo(aimEnd.x, aimEnd.y);
    ctx.lineTo(
      aimEnd.x - headLen * Math.cos(unit.facing + Math.PI / 6),
      aimEnd.y - headLen * Math.sin(unit.facing + Math.PI / 6),
    );
    ctx.strokeStyle = "rgb(25, 39, 12)";
    ctx.lineWidth = 5;

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
  mouseDown.x = e.offsetX;
  mouseDown.y = e.offsetY;

  if (unit.selected && !clickedunit) {
    // Already selected, clicking elsewhere → start aiming an arrow
    aimEnd = { x: e.offsetX, y: e.offsetY };
    potentialAim = true;
  } else if (clickedunit) {
    // Tap the unit → select it
    unit.selected = true;
  } else {
    // Clicked empty space with nothing selected → deselect
    unit.selected = false;
  }
});

canvas.addEventListener("mousemove", (e) => {
  // calculate the distance dx / dy

  if (potentialAim) {
    const dx = e.offsetX - mouseDown.x;
    const dy = e.offsetY - mouseDown.y;
    const length = Math.sqrt(dx ** 2 + dy ** 2);

    if (length > DRAG_BOUNDARY) {
      aiming = true;
    }
  }

  if (aiming) {
    aimEnd = { x: e.offsetX, y: e.offsetY };
  }
});

canvas.addEventListener("mouseup", () => {
  if (aiming) {
    unit.orderIssuedAt = null;
    // Here's where you'd issue the order — e.g. set a move target
    // For now, just stop aiming
    if (unit.state !== "moving") {
      unit.state = "preparing";
      unit.orderIssuedAt = Date.now();
    } else {
      unit.orderIssuedAt = Date.now();
      unit.state = "preparing";
    }

    unit.pendingTarget = { x: aimEnd.x, y: aimEnd.y };
    aiming = false;
    potentialAim = false;
  }

  aiming = false;
  potentialAim = false;
});

const loop = () => {
  let squishTarget = 0;

  if (unit.state === "preparing") {
    console.log("Loop - Preparing");
    const timeNow = Date.now();
    if (unit.orderIssuedAt && timeNow - unit.orderIssuedAt > PREPARATION_MS) {
      unit.state = "moving";
      console.log("MOVING");
      unit.target = unit.pendingTarget;
      unit.pendingTarget = null;
    }

    if (unit.target) {
      const dx = unit.target.x - unit.x;
      const dy = unit.target.y - unit.y;

      const length = Math.sqrt(dx ** 2 + dy ** 2);
      if (length < TRAVEL_SPEED) {
        unit.state = "idle";
        unit.target = null;
        currentSpeed = 0;
      } else {
        currentSpeed = currentSpeed + (TRAVEL_SPEED - currentSpeed) * 0.1;
        unit.x += (dx / length) * currentSpeed;
        unit.y += (dy / length) * currentSpeed;

        const targetAngle = Math.atan2(
          unit.target.y - unit.y,
          unit.target.x - unit.x,
        );
        unit.facing = targetAngle;
      }
    }
  }

  if (unit.state === "idle") {
    squishTarget = 0;
    currentSpeed = 0;
  }

  if (unit.state === "moving") {
    squishTarget = 1;

    if (!unit.target) return;
    const dx = unit.target.x - unit.x;
    const dy = unit.target.y - unit.y;

    const length = Math.sqrt(dx ** 2 + dy ** 2);

    if (length < TRAVEL_SPEED) {
      unit.state = "idle";
      unit.target = null;
    } else {
      console.log(currentSpeed);
      currentSpeed = currentSpeed + (TRAVEL_SPEED - currentSpeed) * 0.02;

      unit.x += (dx / length) * currentSpeed;
      unit.y += (dy / length) * currentSpeed;

      const targetAngle = Math.atan2(
        unit.target.y - unit.y,
        unit.target.x - unit.x,
      );
      unit.facing = targetAngle;
    }
  }
  squish = squish + (squishTarget - squish) * 0.1;

  draw();
  requestAnimationFrame(loop);
};

loop();
