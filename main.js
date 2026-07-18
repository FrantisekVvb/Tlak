const STAGE_WIDTH = 922;
const FLOOR_VIEW_HEIGHT = 119;
const STAGE_HEIGHT = 457;
const FLOOR_Y_OFFSET = STAGE_HEIGHT - FLOOR_VIEW_HEIGHT;
const BOX_UNIT = 89.43819;
const BOX_DEPTH_X = 30.56175;
const BOX_DEPTH_Y = -30.5618;
const BOX_PAD = 1.5;
const TILE_FRONT_Y = 116.987;
const TILE_FRONT_WIDTH = 88.98881;
const TILE_FRONT_LEFT = [
  3.62109, 90.6211, 179.121, 267.621, 356.121,
];
const TILE_CORNERS = [
  {
    bl: [34.1829, 86.4248],
    br: [124.071, 86.4248],
    fr: [92.6099, 116.987],
    fl: [3.62109, 116.987],
  },
  {
    bl: [121.183, 86.4248],
    br: [211.071, 86.4248],
    fr: [179.61, 116.987],
    fl: [90.6211, 116.987],
  },
  {
    bl: [209.683, 86.4248],
    br: [299.571, 86.4248],
    fr: [268.11, 116.987],
    fl: [179.121, 116.987],
  },
  {
    bl: [298.183, 86.4248],
    br: [388.071, 86.4248],
    fr: [356.61, 116.987],
    fl: [267.621, 116.987],
  },
  {
    bl: [386.683, 86.4248],
    br: [476.571, 86.4248],
    fr: [445.11, 116.987],
    fl: [356.121, 116.987],
  },
];
const TILE_CY = 101.706 + FLOOR_Y_OFFSET;
const SNAP_RADIUS = 58;
const INITIAL_TILE_ID = 0;
const MIN_SIZE_UNITS = 1;
const MAX_WIDTH_UNITS = 5;
const MAX_HEIGHT_UNITS = 4;
const WEIGHT_PER_CUBE = 1000;
const MASS_PER_CUBE_KG = 100;
const TILE_AREA_M2 = 1;
const WEIGHT_DISPLAY_WIDTH = 120;
const WEIGHT_DISPLAY_HEIGHT = 150;
const WEIGHT_ARROW_SHAFT_TOP = 91.4248;
const WEIGHT_ARROW_SHAFT_BOTTOM = 147.925;
const WEIGHT_ARROW_HEAD_TIP = 148.632;
const WEIGHT_ARROW_LABEL_Y = 144;
const WEIGHT_ARROW_SHAFT_X = 45.4326;
const WEIGHT_ARROW_BASE_LENGTH =
  WEIGHT_ARROW_HEAD_TIP - WEIGHT_ARROW_SHAFT_TOP;
const TILE_SPACING_STAGE = TILE_FRONT_WIDTH;

const FLOOR_TILES = [
  { id: 0, cx: 63.621, cy: TILE_CY },
  { id: 1, cx: 150.621, cy: TILE_CY },
  { id: 2, cx: 239.121, cy: TILE_CY },
  { id: 3, cx: 327.621, cy: TILE_CY },
  { id: 4, cx: 416.121, cy: TILE_CY },
];

const stage = document.getElementById("stage");
const floor = document.getElementById("floor");
const cubeLayer = document.getElementById("cubeLayer");
const labModeBtn = document.getElementById("labModeBtn");
const pressureCalcToggleBtn = document.getElementById("pressureCalcToggleBtn");
const weightCalcToggleBtn = document.getElementById("weightCalcToggleBtn");
const areaCalcToggleBtn = document.getElementById("areaCalcToggleBtn");
const totalWeightDisplay = document.getElementById("totalWeightDisplay");
const totalWeightValue = document.getElementById("totalWeightValue");
const areaDisplayEl = document.getElementById("areaDisplay");
const totalAreaValue = document.getElementById("totalAreaValue");
const totalPressureValue = document.getElementById("totalPressureValue");
const pressureDisplayEl = document.getElementById("pressureDisplay");
const pressureCalcEl = document.getElementById("pressureCalc");
const pressureInputEl = document.getElementById("pressureInput");
const pressureFeedbackEl = document.getElementById("pressureFeedback");
const weightCalcEl = document.getElementById("weightCalc");
const weightInputEl = document.getElementById("weightInput");
const weightFeedbackEl = document.getElementById("weightFeedback");
const areaCalcEl = document.getElementById("areaCalc");
const areaInputEl = document.getElementById("areaInput");
const areaFeedbackEl = document.getElementById("areaFeedback");
const mathKeypad = document.getElementById("mathKeypad");

if (
  !stage ||
  !floor ||
  !cubeLayer ||
  !labModeBtn ||
  !pressureCalcToggleBtn ||
  !weightCalcToggleBtn ||
  !areaCalcToggleBtn ||
  !totalWeightDisplay ||
  !totalWeightValue ||
  !areaDisplayEl ||
  !totalAreaValue ||
  !totalPressureValue ||
  !pressureDisplayEl ||
  !pressureCalcEl ||
  !pressureInputEl ||
  !pressureFeedbackEl ||
  !weightCalcEl ||
  !weightInputEl ||
  !weightFeedbackEl ||
  !areaCalcEl ||
  !areaInputEl ||
  !areaFeedbackEl ||
  !mathKeypad
) {
  throw new Error("Missing required elements.");
}

const cubes = [];
const occupiedTiles = new Map();
let floorSvg = null;
let floorHighlightLayer = null;
let drag = null;
let nextCubeId = 0;
let showWeight = true;
let appMode = "lab";
let weightDisplayTemplate = "";

function isChallengeMode() {
  return appMode === "pressure" || appMode === "weight" || appMode === "area";
}

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

function getBoxGeometry(widthUnits, heightUnits) {
  const frontW = BOX_UNIT * widthUnits;
  const frontH = BOX_UNIT * heightUnits;
  const fbl = {
    x: BOX_PAD,
    y: BOX_PAD + frontH - BOX_DEPTH_Y,
  };
  const fbr = { x: fbl.x + frontW, y: fbl.y };
  const ftl = { x: fbl.x, y: fbl.y - frontH };
  const ftr = { x: fbl.x + frontW, y: fbl.y - frontH };
  const btl = { x: ftl.x + BOX_DEPTH_X, y: ftl.y + BOX_DEPTH_Y };
  const btr = { x: ftr.x + BOX_DEPTH_X, y: ftr.y + BOX_DEPTH_Y };
  const bbr = { x: fbr.x + BOX_DEPTH_X, y: fbr.y + BOX_DEPTH_Y };
  const vbW = fbr.x + BOX_DEPTH_X + BOX_PAD;
  const vbH = fbl.y + BOX_PAD;

  return { frontW, frontH, fbl, fbr, ftl, ftr, btl, btr, bbr, vbW, vbH };
}

function buildBoxSvgMarkup(widthUnits, heightUnits) {
  const g = getBoxGeometry(widthUnits, heightUnits);
  const round = (value) => Math.round(value * 1000) / 1000;
  const p = (point) => `${round(point.x)} ${round(point.y)}`;

  const outline = [
    `M${p(g.fbr)}`,
    `H${round(g.fbl.x)}`,
    `L${p(g.ftl)}`,
    `L${p(g.btl)}`,
    `H${round(g.btr.x)}`,
    `V${round(g.bbr.y)}`,
    `L${p(g.fbr)}`,
    "Z",
  ].join("");

  const edges = [
    `M${p(g.fbr)}V${round(g.ftr.y)}`,
    `M${p(g.btr)}L${p(g.ftr)}`,
    `M${p(g.ftl)}H${round(g.ftr.x)}`,
  ].join("");

  // Visible bottom contact edges: front (fbl→fbr) and depth (fbr→bbr).
  const baseEdges = [
    `M${p(g.fbl)}H${round(g.fbr.x)}`,
    `M${p(g.fbr)}L${p(g.bbr)}`,
  ].join("");

  return [
    `<svg class="cube__svg" viewBox="0 0 ${round(g.vbW)} ${round(g.vbH)}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`,
    `<path d="${outline}" fill="#d7e0f4"/>`,
    `<path d="${outline}${edges}" stroke="#3d5a9a" stroke-width="3"/>`,
    `<path class="cube__base-edges" d="${baseEdges}" stroke="#dc2626" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`,
    "</svg>",
  ].join("");
}

function getCubeStageSize(widthUnits, heightUnits) {
  const geometry = getBoxGeometry(widthUnits, heightUnits);
  const width = (TILE_FRONT_WIDTH * widthUnits * geometry.vbW) / geometry.frontW;
  const height = width * (geometry.vbH / geometry.vbW);
  return { width, height, geometry };
}

function unitCubeStageHeight() {
  return getCubeStageSize(1, 1).height;
}

function snappedTopLeft(tile, widthUnits, heightUnits) {
  const { width, height, geometry } = getCubeStageSize(widthUnits, heightUnits);
  const frontLeft = TILE_FRONT_LEFT[tile.id];

  return {
    x: frontLeft - width * (geometry.fbl.x / geometry.vbW),
    y:
      FLOOR_Y_OFFSET +
      TILE_FRONT_Y -
      height * (geometry.fbl.y / geometry.vbH),
  };
}

function cubeSnapPoint(cube) {
  const { width, geometry } = getCubeStageSize(cube.widthUnits, cube.heightUnits);
  return {
    x: cube.x + width * ((geometry.fbl.x + BOX_UNIT / 2) / geometry.vbW),
    y: TILE_CY,
  };
}

function maxWidthForTile(tileId) {
  return Math.min(MAX_WIDTH_UNITS, FLOOR_TILES.length - tileId);
}

function clampSize(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getOccupiedCube(tileId) {
  return occupiedTiles.get(tileId) ?? null;
}

function getSnappedCubes() {
  const seen = new Set();
  const result = [];

  for (const cube of occupiedTiles.values()) {
    if (seen.has(cube.id)) continue;
    seen.add(cube.id);
    result.push(cube);
  }

  return result;
}

function getTotalWeight() {
  return getSnappedCubes().reduce((sum, cube) => sum + cube.weightN, 0);
}

function formatPressure(value) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatWeightLabel(weightN) {
  return `${weightN.toLocaleString("cs-CZ")} N`;
}

function formatMassLabel(massKg) {
  return `${massKg.toLocaleString("cs-CZ")} kg`;
}

function getCubeVolumeUnits(cube) {
  return cube.widthUnits * cube.heightUnits;
}

function updateCubeMass(cube) {
  const volume = getCubeVolumeUnits(cube);
  cube.massKg = MASS_PER_CUBE_KG * volume;
  cube.weightN = WEIGHT_PER_CUBE * volume;
}

function getTotalArea() {
  return occupiedTiles.size * TILE_AREA_M2;
}

function getCorrectPressure() {
  const totalWeight = getTotalWeight();
  const totalArea = getTotalArea();
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

function clearWeightFeedback() {
  weightFeedbackEl.hidden = true;
  weightFeedbackEl.textContent = "";
  weightFeedbackEl.classList.remove("is-success", "is-error");
}

function clearAreaFeedback() {
  areaFeedbackEl.hidden = true;
  areaFeedbackEl.textContent = "";
  areaFeedbackEl.classList.remove("is-success", "is-error");
}

function showPressureFeedback(message, kind) {
  pressureFeedbackEl.hidden = false;
  pressureFeedbackEl.textContent = message;
  pressureFeedbackEl.classList.toggle("is-success", kind === "success");
  pressureFeedbackEl.classList.toggle("is-error", kind === "error");
}

function showWeightFeedback(message, kind) {
  weightFeedbackEl.hidden = false;
  weightFeedbackEl.textContent = message;
  weightFeedbackEl.classList.toggle("is-success", kind === "success");
  weightFeedbackEl.classList.toggle("is-error", kind === "error");
}

function showAreaFeedback(message, kind) {
  areaFeedbackEl.hidden = false;
  areaFeedbackEl.textContent = message;
  areaFeedbackEl.classList.toggle("is-success", kind === "success");
  areaFeedbackEl.classList.toggle("is-error", kind === "error");
}

function updatePressureDisplay() {
  if (appMode === "pressure") return;

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
    setWeightVisible(true);
    showPressureFeedback("Správně!", "success");
    return;
  }

  showPressureFeedback("To není správně. Zkus to znovu.", "error");
}

function verifyWeightInput() {
  const value = parseNumberInput(weightInputEl.value);
  if (value === null) {
    showWeightFeedback("Zadej číslo.", "error");
    return;
  }

  const roundedInput = Math.round(value * 10) / 10;
  const roundedCorrect = Math.round(getTotalWeight() * 10) / 10;
  if (Math.abs(roundedInput - roundedCorrect) < 0.05) {
    setWeightVisible(true);
    showWeightFeedback("Správně!", "success");
    return;
  }

  showWeightFeedback("To není správně. Zkus to znovu.", "error");
}

function verifyAreaInput() {
  const value = parseNumberInput(areaInputEl.value);
  if (value === null) {
    showAreaFeedback("Zadej číslo.", "error");
    return;
  }

  const roundedInput = Math.round(value * 10) / 10;
  const roundedCorrect = Math.round(getTotalArea() * 10) / 10;
  if (Math.abs(roundedInput - roundedCorrect) < 0.05) {
    setWeightVisible(true);
    showAreaFeedback("Správně!", "success");
    return;
  }

  showAreaFeedback("To není správně. Zkus to znovu.", "error");
}

function setAppMode(mode) {
  appMode = mode;
  const isLab = mode === "lab";
  const isPressure = mode === "pressure";
  const isWeight = mode === "weight";
  const isArea = mode === "area";

  labModeBtn.setAttribute("aria-pressed", String(isLab));
  pressureCalcToggleBtn.setAttribute("aria-pressed", String(isPressure));
  weightCalcToggleBtn.setAttribute("aria-pressed", String(isWeight));
  areaCalcToggleBtn.setAttribute("aria-pressed", String(isArea));

  document.body.classList.toggle("mode-hide-mass", isWeight);
  document.body.classList.toggle("mode-hide-floor", isArea);
  document.body.classList.toggle("mode-object-locked", !isLab);
  mathKeypad.hidden = isLab;

  totalWeightDisplay.hidden = isWeight;
  weightCalcEl.hidden = !isWeight;
  areaDisplayEl.hidden = isArea;
  areaCalcEl.hidden = !isArea;
  pressureDisplayEl.hidden = isPressure;
  pressureCalcEl.hidden = !isPressure;

  clearPressureFeedback();
  clearWeightFeedback();
  clearAreaFeedback();
  pressureInputEl.value = "";
  weightInputEl.value = "";
  areaInputEl.value = "";

  if (isLab) {
    setWeightVisible(true);
    removeAllCubes();
    placeInitialCube();
    updatePressureDisplay();
    return;
  }

  setWeightVisible(false);
  placeRandomCube();

  if (isPressure) {
    pressureInputEl.focus();
    return;
  }

  if (isWeight) {
    weightInputEl.focus();
    return;
  }

  areaInputEl.focus();
}

function updateTotalWeight() {
  const totalWeight = getTotalWeight();
  const totalArea = getTotalArea();

  totalWeightValue.textContent = totalWeight.toLocaleString("cs-CZ");
  totalAreaValue.textContent = String(totalArea);
  updatePressureDisplay();
}

function removeWeightMarkers() {
  for (const marker of cubeLayer.querySelectorAll(".weight-marker")) {
    marker.remove();
  }
}

function getWeightArrowExtension(heightUnits) {
  return WEIGHT_ARROW_BASE_LENGTH * Math.max(0, heightUnits - 1);
}

function buildWeightArrowShaftPath(extension) {
  const shaftBottom = WEIGHT_ARROW_SHAFT_BOTTOM + extension;

  return [
    `M46.4326 ${WEIGHT_ARROW_SHAFT_TOP}V90.4248H44.4326V${WEIGHT_ARROW_SHAFT_TOP}H45.4326H46.4326`,
    `M45.4326 ${WEIGHT_ARROW_SHAFT_TOP}H44.4326V${shaftBottom}H45.4326H46.4326V${WEIGHT_ARROW_SHAFT_TOP}H45.4326`,
  ].join("Z") + "Z";
}

function applyWeightArrowGeometry(svg, heightUnits) {
  const extension = getWeightArrowExtension(heightUnits);
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

  // Include a little room below the tip so the label stays inside the viewBox.
  const arrowViewHeight =
    WEIGHT_ARROW_BASE_LENGTH * heightUnits + (WEIGHT_DISPLAY_HEIGHT - WEIGHT_ARROW_HEAD_TIP);
  svg.setAttribute(
    "viewBox",
    `0 ${WEIGHT_ARROW_SHAFT_TOP} ${WEIGHT_DISPLAY_WIDTH} ${arrowViewHeight}`,
  );
  svg.removeAttribute("height");
  svg.removeAttribute("width");

  return { extension, arrowViewHeight };
}

function createWeightMarker(weight, heightUnits, left, top, width, height) {
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

  const { extension } = applyWeightArrowGeometry(svg, heightUnits);

  const label = svg.querySelector(".weight-display__label");
  if (label) {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", "77");
    text.setAttribute("y", String(WEIGHT_ARROW_LABEL_Y + extension));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("fill", "black");
    text.setAttribute("class", "weight-display__label-text");
    text.textContent = formatWeightLabel(weight);
    label.replaceWith(text);
  }

  marker.appendChild(svg);
  return marker;
}

function updateWeightArrows() {
  updateTotalWeight();
  removeWeightMarkers();

  if (!showWeight || !weightDisplayTemplate) return;

  requestAnimationFrame(() => {
    const stageRect = stage.getBoundingClientRect();
    if (stageRect.width === 0 || stageRect.height === 0) return;

    for (const cube of getSnappedCubes()) {
      if (cube.tileId === null) continue;

      const unitSize = getCubeStageSize(1, cube.heightUnits);
      const markerWidth =
        (unitSize.width / STAGE_WIDTH) * stageRect.width;
      const scale = markerWidth / WEIGHT_DISPLAY_WIDTH;
      const arrowViewHeight =
        WEIGHT_ARROW_BASE_LENGTH * cube.heightUnits +
        (WEIGHT_DISPLAY_HEIGHT - WEIGHT_ARROW_HEAD_TIP);
      const markerHeight = arrowViewHeight * scale;
      const weightPerTile = cube.weightN / cube.widthUnits;

      for (let i = 0; i < cube.widthUnits; i += 1) {
        const tile = FLOOR_TILES[cube.tileId + i];
        if (!tile) continue;

        const tileCenterX = (tile.cx / STAGE_WIDTH) * stageRect.width;
        const tileCenterY = (tile.cy / STAGE_HEIGHT) * stageRect.height;
        const left =
          tileCenterX - (WEIGHT_ARROW_SHAFT_X / WEIGHT_DISPLAY_WIDTH) * markerWidth;
        const top = tileCenterY;

        const marker = createWeightMarker(
          weightPerTile,
          cube.heightUnits,
          (left / stageRect.width) * 100,
          (top / stageRect.height) * 100,
          (markerWidth / stageRect.width) * 100,
          (markerHeight / stageRect.height) * 100,
        );
        cube.el.insertAdjacentElement("beforebegin", marker);
      }
    }
  });
}

function setWeightVisible(visible) {
  showWeight = visible;
  updateWeightArrows();
}

function getTileElement(tileId) {
  return floor.querySelector(`#tile-${tileId}`);
}

function groupConsecutiveTileIds(ids) {
  if (ids.length === 0) return [];

  const sorted = [...ids].sort((a, b) => a - b);
  const groups = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] === prev + 1) {
      prev = sorted[i];
      continue;
    }

    groups.push([start, prev]);
    start = sorted[i];
    prev = sorted[i];
  }

  groups.push([start, prev]);
  return groups;
}

function buildMergedTileHighlightPath(fromId, toId) {
  const left = TILE_CORNERS[fromId];
  const right = TILE_CORNERS[toId];
  if (!left || !right) return "";

  const round = (value) => Math.round(value * 1000) / 1000;
  return [
    `M${round(left.bl[0])} ${round(left.bl[1])}`,
    `H${round(right.br[0])}`,
    `L${round(right.fr[0])} ${round(right.fr[1])}`,
    `H${round(left.fl[0])}`,
    "Z",
  ].join("");
}

function refreshFloorHighlights() {
  if (!floorHighlightLayer) return;

  floorHighlightLayer.replaceChildren();

  for (const tile of FLOOR_TILES) {
    const tileEl = getTileElement(tile.id);
    tileEl?.classList.toggle("is-occupied", occupiedTiles.has(tile.id));
  }

  const groups = groupConsecutiveTileIds([...occupiedTiles.keys()]);
  for (const [fromId, toId] of groups) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.classList.add("floor-tile__highlight");
    path.setAttribute("d", buildMergedTileHighlightPath(fromId, toId));
    path.setAttribute("fill", "#dc2626");
    path.setAttribute("fill-opacity", "0.22");
    path.setAttribute("stroke", "#dc2626");
    path.setAttribute("stroke-width", "4");
    path.setAttribute("stroke-linejoin", "round");
    floorHighlightLayer.appendChild(path);
  }
}

function setupFloorHighlightLayer() {
  floorSvg = floor.querySelector(".floor-svg");
  if (!floorSvg) return;

  floorHighlightLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  floorHighlightLayer.id = "floor-highlight-layer";
  floorSvg.appendChild(floorHighlightLayer);
}

function findNearestTile(x, y, widthUnits = 1) {
  let bestTile = null;
  let bestDistance = SNAP_RADIUS;
  const maxTileId = FLOOR_TILES.length - widthUnits;

  for (const tile of FLOOR_TILES) {
    if (tile.id > maxTileId) continue;
    if (tileSpanConflicts(tile.id, widthUnits, null)) continue;

    const distance = Math.hypot(x - tile.cx, y - tile.cy);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestTile = tile;
    }
  }

  return bestTile;
}

function tileSpanConflicts(startTileId, widthUnits, ignoreCubeId) {
  for (let id = startTileId; id < startTileId + widthUnits; id += 1) {
    const occupant = getOccupiedCube(id);
    if (occupant && occupant.id !== ignoreCubeId) return true;
  }
  return false;
}

function cubeDepthValue(cube) {
  if (cube.tileId !== null) {
    return cube.tileId;
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

function clearTileOccupancy(cube) {
  if (cube.tileId === null) return;

  for (let id = cube.tileId; id < cube.tileId + cube.widthUnits; id += 1) {
    if (occupiedTiles.get(id) === cube) {
      occupiedTiles.delete(id);
    }
  }

  cube.tileId = null;
  cube.el.classList.remove("is-snapped");
  refreshFloorHighlights();
  updateCubeDepthOrder();
  updateWeightArrows();
}

function applyCubeVisual(cube) {
  const { width, height, geometry } = getCubeStageSize(
    cube.widthUnits,
    cube.heightUnits,
  );

  cube.el.style.width = `${(width / STAGE_WIDTH) * 100}%`;
  cube.el.style.aspectRatio = `${geometry.vbW} / ${geometry.vbH}`;
  cube.el.querySelector(".cube__shape").innerHTML = buildBoxSvgMarkup(
    cube.widthUnits,
    cube.heightUnits,
  );

  const frontRightX = ((geometry.fbr.x / geometry.vbW) * 100).toFixed(2);
  const frontMidX = (
    (((geometry.fbl.x + geometry.fbr.x) / 2) / geometry.vbW) *
    100
  ).toFixed(2);
  const frontTopY = ((geometry.ftl.y / geometry.vbH) * 100).toFixed(2);
  const frontMidY = (
    (((geometry.ftl.y + geometry.fbl.y) / 2) / geometry.vbH) *
    100
  ).toFixed(2);

  cube.widthHandle.style.left = `${frontRightX}%`;
  cube.widthHandle.style.top = `${frontMidY}%`;
  cube.heightHandle.style.left = `${frontMidX}%`;
  cube.heightHandle.style.top = `${frontTopY}%`;

  cube.massLabel.style.left = `${frontMidX}%`;
  cube.massLabel.style.top = `${frontMidY}%`;
  cube.massLabel.textContent = formatMassLabel(cube.massKg);

  const label =
    cube.widthUnits === 1 && cube.heightUnits === 1 ? "Krychle" : "Kvádr";
  cube.el.setAttribute(
    "aria-label",
    `${label}, hmotnost ${formatMassLabel(cube.massKg)}`,
  );
}

function setCubeSize(cube, widthUnits, heightUnits, { keepBottom = true } = {}) {
  const prevHeight = getCubeStageSize(cube.widthUnits, cube.heightUnits).height;
  const nextWidth = clampSize(widthUnits, MIN_SIZE_UNITS, MAX_WIDTH_UNITS);
  const nextHeight = clampSize(heightUnits, MIN_SIZE_UNITS, MAX_HEIGHT_UNITS);
  const bottom = cube.y + prevHeight;

  cube.widthUnits = nextWidth;
  cube.heightUnits = nextHeight;
  updateCubeMass(cube);
  applyCubeVisual(cube);

  if (keepBottom) {
    const nextSize = getCubeStageSize(cube.widthUnits, cube.heightUnits);
    setCubePosition(cube, cube.x, bottom - nextSize.height);
  }
}

function snapCubeToTile(cube, tile) {
  clearTileOccupancy(cube);

  const widthUnits = clampSize(
    cube.widthUnits,
    MIN_SIZE_UNITS,
    maxWidthForTile(tile.id),
  );
  cube.widthUnits = widthUnits;
  updateCubeMass(cube);

  const position = snappedTopLeft(tile, cube.widthUnits, cube.heightUnits);
  setCubePosition(cube, position.x, position.y);
  applyCubeVisual(cube);

  cube.tileId = tile.id;
  for (let id = tile.id; id < tile.id + cube.widthUnits; id += 1) {
    occupiedTiles.set(id, cube);
  }

  cube.el.classList.add("is-snapped");
  refreshFloorHighlights();
  updateCubeDepthOrder();
  updateWeightArrows();
}

function trySnapCube(cube) {
  const point = cubeSnapPoint(cube);
  const tile = findNearestTile(point.x, point.y, cube.widthUnits);

  if (tile) {
    snapCubeToTile(cube, tile);
    return;
  }

  clearTileOccupancy(cube);
}

function createCubeElement(cube) {
  const el = document.createElement("div");
  el.className = "cube";
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", "Krychle");
  el.innerHTML = [
    '<div class="cube__shape"></div>',
    '<span class="cube-mass" aria-hidden="true"></span>',
    '<button type="button" class="cube-handle cube-handle--width" aria-label="Změnit šířku"></button>',
    '<button type="button" class="cube-handle cube-handle--height" aria-label="Změnit výšku"></button>',
  ].join("");

  const massLabel = el.querySelector(".cube-mass");
  const widthHandle = el.querySelector(".cube-handle--width");
  const heightHandle = el.querySelector(".cube-handle--height");

  el.addEventListener("pointerdown", onCubePointerDown);
  widthHandle.addEventListener("pointerdown", (event) => {
    onResizePointerDown(event, cube, "width");
  });
  heightHandle.addEventListener("pointerdown", (event) => {
    onResizePointerDown(event, cube, "height");
  });

  cubeLayer.appendChild(el);
  return { el, massLabel, widthHandle, heightHandle };
}

function createCube(x, y) {
  const cube = {
    id: nextCubeId++,
    el: null,
    massLabel: null,
    widthHandle: null,
    heightHandle: null,
    x: 0,
    y: 0,
    tileId: null,
    widthUnits: 1,
    heightUnits: 1,
    massKg: MASS_PER_CUBE_KG,
    weightN: WEIGHT_PER_CUBE,
  };

  const elements = createCubeElement(cube);
  cube.el = elements.el;
  cube.massLabel = elements.massLabel;
  cube.widthHandle = elements.widthHandle;
  cube.heightHandle = elements.heightHandle;

  updateCubeMass(cube);
  applyCubeVisual(cube);
  setCubePosition(cube, x, y);
  cubes.push(cube);
  return cube;
}

function beginDrag(cube, pointerId, clientX, clientY) {
  const point = clientToStage(clientX, clientY);
  drag = {
    type: "move",
    cube,
    pointerId,
    offsetX: point.x - cube.x,
    offsetY: point.y - cube.y,
  };

  clearTileOccupancy(cube);
  cube.el.classList.add("is-dragging");
  cube.el.setPointerCapture(pointerId);
}

function beginResize(cube, axis, pointerId, clientX, clientY) {
  drag = {
    type: "resize",
    axis,
    cube,
    pointerId,
    startX: clientX,
    startY: clientY,
    startWidth: cube.widthUnits,
    startHeight: cube.heightUnits,
    startTileId: cube.tileId,
  };

  cube.el.classList.add("is-resizing");
  cube.el.setPointerCapture(pointerId);
}

function moveDrag(clientX, clientY) {
  if (!drag) return;

  if (drag.type === "move") {
    const point = clientToStage(clientX, clientY);
    setCubePosition(
      drag.cube,
      point.x - drag.offsetX,
      point.y - drag.offsetY,
    );
    updateCubeDepthOrder();
    return;
  }

  if (drag.type === "resize") {
    updateResize(clientX, clientY);
  }
}

function updateResize(clientX, clientY) {
  const cube = drag.cube;
  const dx = clientToStage(clientX, clientY).x - clientToStage(drag.startX, drag.startY).x;
  const dy = clientToStage(clientX, clientY).y - clientToStage(drag.startX, drag.startY).y;

  if (drag.axis === "width") {
    const maxWidth =
      drag.startTileId === null
        ? MAX_WIDTH_UNITS
        : maxWidthForTile(drag.startTileId);
    const nextWidth = clampSize(
      Math.round(drag.startWidth + dx / TILE_SPACING_STAGE),
      MIN_SIZE_UNITS,
      maxWidth,
    );

    if (nextWidth === cube.widthUnits) return;

    if (drag.startTileId !== null) {
      for (let id = drag.startTileId; id < drag.startTileId + cube.widthUnits; id += 1) {
        if (occupiedTiles.get(id) === cube) {
          occupiedTiles.delete(id);
        }
      }
    }

    setCubeSize(cube, nextWidth, cube.heightUnits, { keepBottom: true });

    if (drag.startTileId !== null) {
      const tile = FLOOR_TILES.find((item) => item.id === drag.startTileId);
      if (!tile) return;

      const position = snappedTopLeft(tile, cube.widthUnits, cube.heightUnits);
      setCubePosition(cube, position.x, position.y);
      cube.tileId = tile.id;

      for (let id = tile.id; id < tile.id + cube.widthUnits; id += 1) {
        occupiedTiles.set(id, cube);
      }

      cube.el.classList.add("is-snapped");
      refreshFloorHighlights();
      updateWeightArrows();
    }

    return;
  }

  const nextHeight = clampSize(
    Math.round(drag.startHeight - dy / (unitCubeStageHeight() * 0.85)),
    MIN_SIZE_UNITS,
    MAX_HEIGHT_UNITS,
  );

  if (nextHeight === cube.heightUnits) return;

  setCubeSize(cube, cube.widthUnits, nextHeight, { keepBottom: true });

  if (drag.startTileId !== null) {
    const tile = FLOOR_TILES.find((item) => item.id === drag.startTileId);
    if (!tile) return;

    const position = snappedTopLeft(tile, cube.widthUnits, cube.heightUnits);
    setCubePosition(cube, position.x, position.y);
    updateWeightArrows();
  }
}

function endDrag(pointerId) {
  if (!drag || drag.pointerId !== pointerId) return;

  const cube = drag.cube;
  const type = drag.type;
  cube.el.classList.remove("is-dragging", "is-resizing");
  releasePointerCaptureSafe(cube.el, pointerId);

  if (type === "move") {
    trySnapCube(cube);
  } else if (type === "resize" && cube.tileId !== null) {
    updateWeightArrows();
  } else if (type === "resize") {
    updateTotalWeight();
  }

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
  if (!isPrimaryPointerDown(event) || drag || isChallengeMode()) return;
  if (event.target.closest(".cube-handle")) return;

  event.preventDefault();
  const cube = cubes.find((item) => item.el === event.currentTarget);
  if (!cube) return;

  beginDrag(cube, event.pointerId, event.clientX, event.clientY);
}

function onResizePointerDown(event, cube, axis) {
  if (!isPrimaryPointerDown(event) || drag || isChallengeMode()) return;

  event.preventDefault();
  event.stopPropagation();
  beginResize(cube, axis, event.pointerId, event.clientX, event.clientY);
}

function onPointerMove(event) {
  if (!drag || drag.pointerId !== event.pointerId) return;
  event.preventDefault();
  moveDrag(event.clientX, event.clientY);
}

function onPointerUp(event) {
  endDrag(event.pointerId);
}

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function removeAllCubes() {
  for (const cube of [...cubes]) {
    clearTileOccupancy(cube);
    cube.el.remove();
  }
  cubes.length = 0;
  removeWeightMarkers();
}

function placeRandomCube() {
  removeAllCubes();

  const heightUnits = randomInt(MIN_SIZE_UNITS, MAX_HEIGHT_UNITS);
  const widthUnits = randomInt(MIN_SIZE_UNITS, MAX_WIDTH_UNITS);
  const startTileId = randomInt(0, FLOOR_TILES.length - widthUnits);
  const tile = FLOOR_TILES[startTileId];
  const cube = createCube(0, 0);

  cube.widthUnits = widthUnits;
  cube.heightUnits = heightUnits;
  updateCubeMass(cube);
  snapCubeToTile(cube, tile);
}

function placeInitialCube() {
  const tile = FLOOR_TILES.find((item) => item.id === INITIAL_TILE_ID);
  if (!tile) {
    throw new Error("Initial floor tile not found.");
  }

  snapCubeToTile(createCube(0, 0), tile);
}

function getActiveCalcInput() {
  if (appMode === "pressure") return pressureInputEl;
  if (appMode === "weight") return weightInputEl;
  if (appMode === "area") return areaInputEl;
  return null;
}

function clearActiveCalcFeedback() {
  if (appMode === "pressure") clearPressureFeedback();
  if (appMode === "weight") clearWeightFeedback();
  if (appMode === "area") clearAreaFeedback();
}

function insertIntoCalcInput(text) {
  const input = getActiveCalcInput();
  if (!input) return;

  if (text === "," || text === ".") {
    if (input.value.includes(",") || input.value.includes(".")) return;
  }

  clearActiveCalcFeedback();
  input.value += text;
  input.focus();
}

function deleteFromCalcInput() {
  const input = getActiveCalcInput();
  if (!input) return;

  clearActiveCalcFeedback();
  input.value = input.value.slice(0, -1);
  input.focus();
}

function verifyActiveCalcInput() {
  if (appMode === "pressure") {
    verifyPressureInput();
    return;
  }

  if (appMode === "weight") {
    verifyWeightInput();
    return;
  }

  if (appMode === "area") {
    verifyAreaInput();
  }
}

function onMathKeypadClick(event) {
  const keyBtn = event.target.closest("[data-key]");
  if (!keyBtn || !mathKeypad.contains(keyBtn)) return;

  const key = keyBtn.getAttribute("data-key");
  if (!key) return;

  if (key === "backspace") {
    deleteFromCalcInput();
    return;
  }

  if (key === "ok") {
    verifyActiveCalcInput();
    return;
  }

  insertIntoCalcInput(key);
}

function bindEvents() {
  labModeBtn.addEventListener("click", () => setAppMode("lab"));
  pressureCalcToggleBtn.addEventListener("click", () => setAppMode("pressure"));
  weightCalcToggleBtn.addEventListener("click", () => setAppMode("weight"));
  areaCalcToggleBtn.addEventListener("click", () => setAppMode("area"));
  pressureInputEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      verifyPressureInput();
    }
  });
  weightInputEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      verifyWeightInput();
    }
  });
  areaInputEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      verifyAreaInput();
    }
  });
  mathKeypad.addEventListener("click", onMathKeypadClick);
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
  placeInitialCube();
}

init();
