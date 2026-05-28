import "./style.css";

// Types
type UnitMoveState = "idle" | "preparing" | "moving";

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

// Constants
const PREPARATION_MS = 500 as const;
const TRAVEL_SPEED = 2.5 as const;
const DRAG_BOUNDARY = 10 as const;
const SPACING = 25 as const;
const UNIT_PADDING = 5 as const;
const SIZE = 800 as const;

const canvas = document.getElementById("game")! as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

const unit: Unit = {
  x: 400,
  y: 300,
  radius: 10,
  selected: false,
  state: "idle",
  orderIssuedAt: null,
  target: null,
  pendingTarget: null,
  facing: 0,
};

// Canvas setup
const scale = window.devicePixelRatio;
canvas.width = Math.floor(SIZE * scale);
canvas.height = Math.floor(SIZE * scale);
canvas.style.width = SIZE + "px";
canvas.style.height = SIZE + "px";
ctx.scale(scale, scale);

const colOffsets = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5];
const rowOffsets = [-0.5, 0.5];

// Variables
let aiming: boolean = false;
let potentialAim: boolean = false;
let aimEnd: { x: number; y: number } = { x: 0, y: 0 };
let mouseDown: { x: number; y: number } = { x: 0, y: 0 };
let squish = 0;
let currentSpeed = 0;

// Functionality
const draw = (): void => {
  ctx.clearRect(0, 0, SIZE, SIZE);

  // Moving unit circles
  if (unit.state === "moving") {
    for (let j = 0; j < rowOffsets.length; j++) {
      for (let i = 0; i < colOffsets.length; i++) {
        ctx.beginPath();
        ctx.ellipse(
          unit.x + colOffsets[i] * SPACING,
          unit.y + rowOffsets[j] * SPACING,
          unit.radius - squish * 1,
          unit.radius + squish * 0.2,
          unit.facing,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
  } else {
    // Static unit circles
    for (let j = 0; j < rowOffsets.length; j++) {
      for (let i = 0; i < colOffsets.length; i++) {
        ctx.beginPath();

        ctx.arc(
          unit.x + colOffsets[i] * SPACING,
          unit.y + rowOffsets[j] * SPACING,
          unit.radius,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
  }

  ctx.fillStyle = "rgb(92, 42, 24)";

  // Shield
  for (let j = 0; j < rowOffsets.length; j++) {
    for (let i = 0; i < colOffsets.length; i++) {
      ctx.beginPath();
      ctx.strokeStyle = "rgb(255, 255, 255)";
      ctx.lineWidth = 2;
      ctx.arc(
        unit.x + colOffsets[i] * SPACING,
        unit.y + rowOffsets[j] * SPACING,
        unit.radius + 2,
        unit.facing - Math.PI / 3,
        unit.facing + Math.PI / 3,
      );

      ctx.stroke();
    }
  }

  if (unit.selected) {
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.roundRect(
      unit.x - (colOffsets.length * SPACING) / 2 - UNIT_PADDING,
      unit.y - (rowOffsets.length * SPACING) / 2 - UNIT_PADDING,
      colOffsets.length * SPACING + UNIT_PADDING * 2,
      rowOffsets.length * SPACING + UNIT_PADDING * 2,
      5,
    );
    ctx.strokeStyle = "rgb(255, 255, 255)";
    ctx.lineWidth = 2;
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

    for (let j = 0; j < rowOffsets.length; j++) {
      for (let i = 0; i < colOffsets.length; i++) {
        ctx.beginPath();

        ctx.arc(
          aimEnd.x + colOffsets[i] * SPACING,
          aimEnd.y + rowOffsets[j] * SPACING,
          unit.radius + 2,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }

    ctx.fill();
  }

  if (unit.state === "preparing") {
    if (!unit?.target?.x || !unit?.target?.y) return;
    ctx.beginPath();
    ctx.fillStyle = "rgb(0 0 200 / 50%)";
    for (let j = 0; j < rowOffsets.length; j++) {
      for (let i = 0; i < colOffsets.length; i++) {
        ctx.beginPath();
        ctx.arc(
          unit.x + colOffsets[i] * SPACING,
          unit.y + rowOffsets[j] * SPACING,
          unit.radius,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
  }
};

canvas.addEventListener("contextmenu", (e) => {
  e.preventDefault();
});

canvas.addEventListener("mousedown", (e) => {
  if (e.button == 0) {
    const leftEdge = unit.x - (colOffsets.length * SPACING) / 2 - UNIT_PADDING;
    const width = colOffsets.length * SPACING + UNIT_PADDING * 2;
    const rightEdge = leftEdge + width;

    const topEdge = unit.y - (rowOffsets.length * SPACING) / 2 - UNIT_PADDING;
    const height = rowOffsets.length * SPACING + UNIT_PADDING * 2;
    const bottomEdge = topEdge + height;

    const dx = e.offsetX > leftEdge && e.offsetX < rightEdge;
    const dy = e.offsetY < bottomEdge && e.offsetY > topEdge;
    const clickedunit = dx && dy;

    mouseDown.x = e.offsetX;
    mouseDown.y = e.offsetY;

    if (unit.selected) {
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
  } else if (e.button === 2) {
  }
});

canvas.addEventListener("mousemove", (e) => {
  // calculate the distance dx / dy
  if (e.button === 0) {
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
  } else if (e.button === 2) {
    unit.facing = e.offsetX;
  }
});

canvas.addEventListener("mouseup", () => {
  if (potentialAim && !aiming) {
    unit.selected = false;
  }

  if (aiming) {
    unit.orderIssuedAt = null;
    //d For now, just stop aiming
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
