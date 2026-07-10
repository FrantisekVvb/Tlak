const CUBE_SCALE = 0.95;
const STAGE_WIDTH = 922;
const FLOOR_VIEW_HEIGHT = 119;
const MAX_STACK_PER_TILE = 5;
const CUBE_STACK_LAYER_OFFSET_Y = 85;
const STAGE_HEIGHT = 202 + (MAX_STACK_PER_TILE - 2) * CUBE_STACK_LAYER_OFFSET_Y;
const FLOOR_Y_OFFSET = STAGE_HEIGHT - FLOOR_VIEW_HEIGHT;
const CUBE_WIDTH = 124 * CUBE_SCALE;
const CUBE_HEIGHT = 123 * CUBE_SCALE;
const CUBE_SNAP_OFFSET_X = 56.5;
const CUBE_SNAP_OFFSET_LEFT_PX = 2;
const CUBE_SNAP_OFFSET_BACK_PX = 2;
const CUBE_SNAP_Y = 1.4248;
const TILE_CY = 101.706 + FLOOR_Y_OFFSET;
const SNAP_RADIUS = 58;
const MAX_CUBES = 50;
const WEIGHT_PER_CUBE = 100;
const TILE_AREA_M2 = 1;
const WEIGHT_DISPLAY_WIDTH = 120;
const WEIGHT_DISPLAY_HEIGHT = 150;
const WEIGHT_ARROW_SHAFT_TOP = 91.4248;
const WEIGHT_ARROW_SHAFT_BOTTOM = 147.925;
const WEIGHT_ARROW_HEAD_TOP = 140.854;
const WEIGHT_ARROW_HEAD_TIP = 148.632;
const WEIGHT_ARROW_LABEL_Y = 144;
const WEIGHT_ARROW_BASE_SHAFT_LENGTH =
  WEIGHT_ARROW_HEAD_TOP - WEIGHT_ARROW_SHAFT_TOP;

const FLOOR_TILES = [
  { id: 0, cx: 63.621, cy: TILE_CY },
  { id: 1, cx: 150.621, cy: TILE_CY },
  { id: 2, cx: 239.121, cy: TILE_CY },
  { id: 3, cx: 327.621, cy: TILE_CY },
  { id: 4, cx: 416.121, cy: TILE_CY },
  { id: 5, cx: 504.621, cy: TILE_CY },
  { id: 6, cx: 591.621, cy: TILE_CY },
  { id: 7, cx: 680.121, cy: TILE_CY },
  { id: 8, cx: 768.621, cy: TILE_CY },
  { id: 9, cx: 857.121, cy: TILE_CY },
];

const cubeStack = document.getElementById("cubeStack");
const stage = document.getElementById("stage");
const floor = document.getElementById("floor");
const cubeLayer = document.getElementById("cubeLayer");
const weightToggleBtn = document.getElementById("weightToggleBtn");
const pressureCalcToggleBtn = document.getElementById("pressureCalcToggleBtn");
const totalWeightValue = document.getElementById("totalWeightValue");
const totalAreaValue = document.getElementById("totalAreaValue");
const totalPressureValue = document.getElementById("totalPressureValue");
const pressureDisplayEl = document.getElementById("pressureDisplay");
const pressureCalcEl = document.getElementById("pressureCalc");
const pressureInputEl = document.getElementById("pressureInput");
const pressureVerifyBtn = document.getElementById("pressureVerifyBtn");
const pressureFeedbackEl = document.getElementById("pressureFeedback");

if (
  !cubeStack ||
  !stage ||
  !floor ||
  !cubeLayer ||
  !weightToggleBtn ||
  !pressureCalcToggleBtn ||
  !totalWeightValue ||
  !totalAreaValue ||
  !totalPressureValue ||
  !pressureDisplayEl ||
  !pressureCalcEl ||
  !pressureInputEl ||
  !pressureVerifyBtn ||
  !pressureFeedbackEl
) {
  throw new Error("Missing required elements.");
}

const cubes = [];
const occupiedTiles = new Map();
const tileHighlights = new Map();
let floorSvg = null;
let floorHighlightLayer = null;
let drag = null;
let nextCubeId = 0;
let showWeight = true;
let pressureCalcMode = false;
let weightDisplayTemplate = "";

function isPrimaryPointerDown(event) {
  return event.pointerType !== "mouse" || event.button === 0;
}

function clientToStage(clientX, clientY) {
  const rect = stage.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * STAGE_WIDTH,
    y: ((clientY - rect.top) / rect.height) * STAGE_HEIGHT,
  };
}

function setCubePosition(cube, x, y) {
  cube.x = x;
  cube.y = y;
  cube.el.style.left = `${(x / STAGE_WIDTH) * 100}%`;
  cube.el.style.top = `${(y / STAGE_HEIGHT) * 100}%`;
}

function stageUnitsFromPx(px) {
  const rect = stage.getBoundingClientRect();
  if (rect.width === 0) return 0;
  return (px / rect.width) * STAGE_WIDTH;
}

function stageUnitsFromPxY(px) {
  const rect = stage.getBoundingClientRect();
  if (rect.height === 0) return 0;
  return (px / rect.height) * STAGE_HEIGHT;
}

function snapPositionForTile(tile, layer = 0) {
  return {
    x: tile.cx - CUBE_SNAP_OFFSET_X - stageUnitsFromPx(CUBE_SNAP_OFFSET_LEFT_PX),
    y:
      FLOOR_Y_OFFSET +
      CUBE_SNAP_Y -
      stageUnitsFromPxY(CUBE_SNAP_OFFSET_BACK_PX) -
      layer * CUBE_STACK_LAYER_OFFSET_Y,
  };
}

function cubeSnapPoint(cube) {
  return {
    x: cube.x + CUBE_SNAP_OFFSET_X,
    y: TILE_CY,
  };
}

function getTileStack(tileId) {
  return occupiedTiles.get(tileId) ?? [];
}

function getStackWeight(tileId) {
  return getTileStack(tileId).length * WEIGHT_PER_CUBE;
}

function getTotalSnappedCubeCount() {
  let count = 0;
  for (const stack of occupiedTiles.values()) {
    count += stack.length;
  }
  return count;
}

function formatPressure(value) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function getCorrectPressure() {
  const totalWeight = getTotalSnappedCubeCount() * WEIGHT_PER_CUBE;
  const totalArea = occupiedTiles.size * TILE_AREA_M2;
  return totalArea > 0 ? totalWeight / totalArea : 0;
}

function parseNumberInput(value) {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function clearPressureFeedback() {
  pressureFeedbackEl.hidden = true;
  pressureFeedbackEl.textContent = "";
  pressureFeedbackEl.classList.remove("is-success", "is-error");
}

function showPressureFeedback(message, kind) {
  pressureFeedbackEl.hidden = false;
  pressureFeedbackEl.textContent = message;
  pressureFeedbackEl.classList.toggle("is-success", kind === "success");
  pressureFeedbackEl.classList.toggle("is-error", kind === "error");
}

function updatePressureDisplay() {
  if (pressureCalcMode) return;

  totalPressureValue.textContent = formatPressure(getCorrectPressure());
}

function verifyPressureInput() {
  const value = parseNumberInput(pressureInputEl.value);
  if (value === null) {
    showPressureFeedback("Zadej číslo.", "error");
    return;
  }

  const roundedInput = Math.round(value * 10) / 10;
  const roundedCorrect = Math.round(getCorrectPressure() * 10) / 10;
  if (Math.abs(roundedInput - roundedCorrect) < 0.05) {
    showPressureFeedback("Správně!", "success");
    return;
  }

  showPressureFeedback("To není správně. Zkus to znovu.", "error");
}

function setPressureCalcMode(enabled) {
  pressureCalcMode = enabled;
  pressureCalcToggleBtn.setAttribute("aria-pressed", String(enabled));
  pressureCalcToggleBtn.textContent = enabled ? "Zobrazit tlak" : "Výpočet tlaku";
  pressureDisplayEl.hidden = enabled;
  pressureCalcEl.hidden = !enabled;
  clearPressureFeedback();

  if (enabled) {
    pressureInputEl.value = "";
    pressureInputEl.focus();
    return;
  }

  pressureInputEl.value = "";
  updatePressureDisplay();
}

function updateTotalWeight() {
  const totalWeight = getTotalSnappedCubeCount() * WEIGHT_PER_CUBE;
  const totalArea = occupiedTiles.size * TILE_AREA_M2;

  totalWeightValue.textContent = String(totalWeight);
  totalAreaValue.textContent = String(totalArea);
  updatePressureDisplay();

  if (pressureCalcMode) {
    clearPressureFeedback();
  }
}

function removeWeightMarkers() {
  for (const marker of cubeLayer.querySelectorAll(".weight-marker")) {
    marker.remove();
  }
}

function getWeightArrowExtension(cubeCount) {
  return WEIGHT_ARROW_BASE_SHAFT_LENGTH * Math.max(0, cubeCount - 1);
}

function buildWeightArrowShaftPath(extension) {
  const shaftBottom = WEIGHT_ARROW_SHAFT_BOTTOM + extension;

  return [
    `M46.4326 ${WEIGHT_ARROW_SHAFT_TOP}V90.4248H44.4326V${WEIGHT_ARROW_SHAFT_TOP}H45.4326H46.4326`,
    `M45.4326 ${WEIGHT_ARROW_SHAFT_TOP}H44.4326V${shaftBottom}H45.4326H46.4326V${WEIGHT_ARROW_SHAFT_TOP}H45.4326`,
  ].join("Z") + "Z";
}

function applyWeightArrowGeometry(svg, cubeCount) {
  const extension = getWeightArrowExtension(cubeCount);
  const shaft = svg.querySelector(".weight-display__arrow-shaft");
  const head = svg.querySelector(".weight-display__arrow-head");

  if (shaft) {
    shaft.setAttribute("d", buildWeightArrowShaftPath(extension));
  }

  if (head) {
    if (extension > 0) {
      head.setAttribute("transform", `translate(0 ${extension})`);
    } else {
      head.removeAttribute("transform");
    }
  }

  const displayHeight = WEIGHT_DISPLAY_HEIGHT + extension;
  const arrowViewHeight = displayHeight - WEIGHT_ARROW_SHAFT_TOP;
  svg.setAttribute("viewBox", `0 ${WEIGHT_ARROW_SHAFT_TOP} ${WEIGHT_DISPLAY_WIDTH} ${arrowViewHeight}`);
  svg.removeAttribute("height");

  return { extension, displayHeight, arrowViewHeight };
}

function createWeightMarker(weight, cubeCount, left, top, width, height) {
  const marker = document.createElement("div");
  marker.className = "weight-marker";
  marker.style.left = `${left}%`;
  marker.style.top = `${top}%`;
  marker.style.width = `${width}%`;
  marker.style.height = `${height}%`;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = weightDisplayTemplate.trim();
  const svg = wrapper.firstElementChild;
  if (!svg) return marker;

  svg.setAttribute("aria-hidden", "true");

  const { extension } = applyWeightArrowGeometry(svg, cubeCount);

  const label = svg.querySelector(".weight-display__label");
  if (label) {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", "77");
    text.setAttribute("y", String(WEIGHT_ARROW_LABEL_Y + extension));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("fill", "black");
    text.setAttribute("class", "weight-display__label-text");
    text.textContent = `${weight} N`;
    label.replaceWith(text);
  }

  marker.appendChild(svg);
  return marker;
}

function updateWeightArrows() {
  updateTotalWeight();
  removeWeightMarkers();

  if (!showWeight) {
    weightToggleBtn.setAttribute("aria-pressed", "false");
    weightToggleBtn.textContent = "Zobrazit tíhu";
    return;
  }

  weightToggleBtn.setAttribute("aria-pressed", "true");
  weightToggleBtn.textContent = "Skrýt tíhu";

  if (!weightDisplayTemplate) return;

  requestAnimationFrame(() => {
    const stageRect = stage.getBoundingClientRect();
    if (stageRect.width === 0 || stageRect.height === 0) return;

    for (const tile of FLOOR_TILES) {
      const stack = getTileStack(tile.id);
      if (stack.length === 0) continue;

      const bottomCube = stack[0];
      const img = bottomCube.el.querySelector("img");
      if (!img) continue;

      const imgRect = img.getBoundingClientRect();
      const scale = imgRect.width / WEIGHT_DISPLAY_WIDTH;
      const extension = getWeightArrowExtension(stack.length);
      const displayHeight = WEIGHT_DISPLAY_HEIGHT + extension;
      const arrowViewHeight = displayHeight - WEIGHT_ARROW_SHAFT_TOP;
      const markerWidth = imgRect.width;
      const markerHeight = arrowViewHeight * scale;
      const left = imgRect.left - stageRect.left;
      const top = imgRect.top - stageRect.top + WEIGHT_ARROW_SHAFT_TOP * scale;

      const marker = createWeightMarker(
        getStackWeight(tile.id),
        stack.length,
        (left / stageRect.width) * 100,
        (top / stageRect.height) * 100,
        (markerWidth / stageRect.width) * 100,
        (markerHeight / stageRect.height) * 100,
      );
      bottomCube.el.insertAdjacentElement("beforebegin", marker);
    }
  });
}

function setWeightVisible(visible) {
  showWeight = visible;
  weightToggleBtn.setAttribute("aria-pressed", String(visible));
  weightToggleBtn.textContent = visible ? "Skrýt tíhu" : "Zobrazit tíhu";
  updateWeightArrows();
}

function getTileElement(tileId) {
  return floor.querySelector(`#tile-${tileId}`);
}

function setTileActive(tileId, active) {
  const tileEl = getTileElement(tileId);
  if (!tileEl || !floorHighlightLayer) return;

  tileEl.classList.toggle("is-occupied", active);

  if (active) {
    if (tileHighlights.has(tileId)) return;

    const shape = tileEl.querySelector(".floor-tile__shape");
    if (!shape) return;

    const highlight = shape.cloneNode(true);
    highlight.classList.add("floor-tile__highlight");
    highlight.setAttribute("fill", "none");
    highlight.setAttribute("stroke", "#EB2A2A");
    floorHighlightLayer.appendChild(highlight);
    tileHighlights.set(tileId, highlight);
    return;
  }

  const highlight = tileHighlights.get(tileId);
  if (highlight) {
    highlight.remove();
    tileHighlights.delete(tileId);
  }
}

function setupFloorHighlightLayer() {
  floorSvg = floor.querySelector(".floor-svg");
  if (!floorSvg) return;

  floorHighlightLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  floorHighlightLayer.id = "floor-highlight-layer";
  floorSvg.appendChild(floorHighlightLayer);
}

function findNearestTile(x, y) {
  let bestTile = null;
  let bestDistance = SNAP_RADIUS;

  for (const tile of FLOOR_TILES) {
    if (getTileStack(tile.id).length >= MAX_STACK_PER_TILE) continue;

    const distance = Math.hypot(x - tile.cx, y - tile.cy);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestTile = tile;
    }
  }

  return bestTile;
}

function cubeDepthValue(cube) {
  if (cube.tileId !== null) {
    return cube.tileId * MAX_STACK_PER_TILE + (cube.stackLayer ?? 0);
  }

  return cube.x / 100;
}

function updateCubeDepthOrder() {
  const sorted = [...cubes].sort(
    (a, b) => cubeDepthValue(a) - cubeDepthValue(b),
  );

  for (const cube of sorted) {
    cubeLayer.appendChild(cube.el);
  }
}

function reindexTileStack(tileId) {
  const stack = getTileStack(tileId);
  const tile = FLOOR_TILES.find((item) => item.id === tileId);
  if (!tile) return;

  stack.forEach((cube, layer) => {
    cube.stackLayer = layer;
    const position = snapPositionForTile(tile, layer);
    setCubePosition(cube, position.x, position.y);
    cube.el.classList.add("is-snapped");
  });
}

function clearTileOccupancy(cube) {
  if (cube.tileId === null) return;

  const tileId = cube.tileId;
  const stack = getTileStack(tileId);
  const index = stack.findIndex((item) => item.id === cube.id);

  if (index !== -1) {
    stack.splice(index, 1);
  }

  if (stack.length === 0) {
    occupiedTiles.delete(tileId);
    setTileActive(tileId, false);
  } else {
    occupiedTiles.set(tileId, stack);
    reindexTileStack(tileId);
  }

  cube.tileId = null;
  cube.stackLayer = null;
  cube.el.classList.remove("is-snapped");
  updateCubeDepthOrder();
  updateWeightArrows();
}

function snapCubeToTile(cube, tile) {
  clearTileOccupancy(cube);

  const stack = getTileStack(tile.id);
  const layer = stack.length;
  const position = snapPositionForTile(tile, layer);

  setCubePosition(cube, position.x, position.y);
  cube.tileId = tile.id;
  cube.stackLayer = layer;
  stack.push(cube);
  occupiedTiles.set(tile.id, stack);
  setTileActive(tile.id, true);
  cube.el.classList.add("is-snapped");
  updateCubeDepthOrder();
  updateWeightArrows();
}

function trySnapCube(cube) {
  const point = cubeSnapPoint(cube);
  const tile = findNearestTile(point.x, point.y);

  if (tile) {
    snapCubeToTile(cube, tile);
    return;
  }

  clearTileOccupancy(cube);
}

function createCubeElement() {
  const el = document.createElement("div");
  el.className = "cube";
  el.innerHTML = '<img src="assets/cube.svg" alt="Krychle" width="124" height="123" draggable="false" />';
  el.addEventListener("pointerdown", onCubePointerDown);
  cubeLayer.appendChild(el);
  return el;
}

function createCube(x, y) {
  const cube = {
    id: nextCubeId++,
    el: createCubeElement(),
    x: 0,
    y: 0,
    tileId: null,
    stackLayer: null,
  };

  setCubePosition(cube, x, y);
  cubes.push(cube);
  return cube;
}

function beginDrag(cube, pointerId, clientX, clientY) {
  const point = clientToStage(clientX, clientY);
  drag = {
    cube,
    pointerId,
    offsetX: point.x - cube.x,
    offsetY: point.y - cube.y,
  };

  clearTileOccupancy(cube);
  cube.el.classList.add("is-dragging");
  cube.el.setPointerCapture(pointerId);
}

function moveDrag(clientX, clientY) {
  if (!drag) return;

  const point = clientToStage(clientX, clientY);
  setCubePosition(
    drag.cube,
    point.x - drag.offsetX,
    point.y - drag.offsetY,
  );
  updateCubeDepthOrder();
}

function endDrag(pointerId) {
  if (!drag || drag.pointerId !== pointerId) return;

  const cube = drag.cube;
  cube.el.classList.remove("is-dragging");
  releasePointerCaptureSafe(cube.el, pointerId);
  trySnapCube(cube);
  drag = null;
}

function releasePointerCaptureSafe(element, pointerId) {
  if (typeof element.releasePointerCapture !== "function") return;

  try {
    element.releasePointerCapture(pointerId);
  } catch {
    // Pointer capture may already be released.
  }
}

function onCubePointerDown(event) {
  if (!isPrimaryPointerDown(event) || drag) return;

  event.preventDefault();
  const cube = cubes.find((item) => item.el === event.currentTarget);
  if (!cube) return;

  beginDrag(cube, event.pointerId, event.clientX, event.clientY);
}

function onStackPointerDown(event) {
  if (!isPrimaryPointerDown(event) || drag || cubes.length >= MAX_CUBES) return;

  event.preventDefault();
  const stackRect = cubeStack.getBoundingClientRect();
  const spawnPoint = clientToStage(
    stackRect.left + stackRect.width / 2,
    stackRect.bottom + 10,
  );
  const cube = createCube(
    spawnPoint.x - CUBE_SNAP_OFFSET_X,
    spawnPoint.y - CUBE_HEIGHT,
  );
  beginDrag(cube, event.pointerId, event.clientX, event.clientY);
}

function onPointerMove(event) {
  if (!drag || drag.pointerId !== event.pointerId) return;
  event.preventDefault();
  moveDrag(event.clientX, event.clientY);
}

function onPointerUp(event) {
  endDrag(event.pointerId);
}

function bindEvents() {
  cubeStack.addEventListener("pointerdown", onStackPointerDown);
  weightToggleBtn.addEventListener("click", () => setWeightVisible(!showWeight));
  pressureCalcToggleBtn.addEventListener("click", () => {
    setPressureCalcMode(!pressureCalcMode);
  });
  pressureVerifyBtn.addEventListener("click", verifyPressureInput);
  pressureInputEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      verifyPressureInput();
    }
  });
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
  window.addEventListener("resize", updateWeightArrows);
}

async function init() {
  const [floorResponse, weightResponse] = await Promise.all([
    fetch("assets/floor.svg"),
    fetch("assets/weight-display.svg"),
  ]);

  if (!floorResponse.ok) {
    throw new Error("Failed to load floor.svg");
  }

  if (!weightResponse.ok) {
    throw new Error("Failed to load weight-display.svg");
  }

  floor.innerHTML = await floorResponse.text();
  weightDisplayTemplate = await weightResponse.text();
  setupFloorHighlightLayer();
  bindEvents();
  updateWeightArrows();
}

init();
