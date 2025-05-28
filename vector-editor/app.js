let stage, layer, gridLayer, tr;  // GLOBAL NOW
let selectedShape = null;
const gridSize = 20;
let gridVisible = true;

window.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('container');
  const width = container.clientWidth;
  const height = container.clientHeight;

  stage = new Konva.Stage({
    container: 'container',
    width,
    height
  });

  stage.container().style.border = '2px solid #888';

  layer = new Konva.Layer();
  stage.add(layer);

  tr = new Konva.Transformer({
    rotateEnabled: true,
    ignoreStroke: true,
    padding: 4
  });
  layer.add(tr);

  gridLayer = new Konva.Layer();
  stage.add(gridLayer);

  drawGrid();

  window.addEventListener('resize', () => {
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;
    stage.width(newWidth);
    stage.height(newHeight);
    drawGrid(); // redraw grid
    stage.draw();
  });

  // click on empty space to deselect
  stage.on('click tap', (e) => {
    if (e.target === stage) deselect();
  });

  // delete selected on key press
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Delete') window.deleteSelected();
  });
});

// SNAP FUNCTION - stays same
function snap(val) {
  return Math.round(val / gridSize) * gridSize;
}

// DRAW GRID - now safe to call from anywhere
function drawGrid() {
  gridLayer.destroyChildren();
  const width = stage.width();
  const height = stage.height();

  for (let i = 0; i < width / gridSize; i++) {
    gridLayer.add(new Konva.Line({
      points: [i * gridSize, 0, i * gridSize, height],
      stroke: '#eee',
      strokeWidth: 1
    }));
  }

  for (let j = 0; j < height / gridSize; j++) {
    gridLayer.add(new Konva.Line({
      points: [0, j * gridSize, width, j * gridSize],
      stroke: '#eee',
      strokeWidth: 1
    }));
  }

  gridLayer.moveToBottom();
}

// ============== Tools ==============

function toggleGrid() {
  gridVisible = !gridVisible;
  gridLayer.visible(gridVisible);
  gridLayer.batchDraw();
}

window.addBox = function () {
  const w = stage.width();
  const h = stage.height();

  const rect = new Konva.Rect({
    x: snap(w / 2 - 20),  // center the 40x40 box
    y: snap(h / 2 - 20),
    width: 40,
    height: 40,
    fill: 'transparent',
    stroke: 'blue',
    strokeWidth: 2,
    draggable: true
  });

  enableTransformable(rect);
  layer.add(rect).draw();
};

window.addCircle = function () {
  const w = stage.width();
  const h = stage.height();

  const circ = new Konva.Circle({
    x: snap(w / 2),
    y: snap(h / 2),
    radius: 20,
    fill: 'transparent',
    stroke: 'green',
    strokeWidth: 2,
    draggable: true
  });

  enableTransformable(circ);
  layer.add(circ).draw();
};

window.addText = function () {
  const w = stage.width();
  const h = stage.height();
  
  const text = new Konva.Text({
    x: snap(w / 2 - 20),
    y: snap(h / 3),
    text: 'Label',
    fontSize: 20,
    fontFamily: 'Arial',
    fill: 'black',
    draggable: true
  });

  text._originalStroke = text.stroke();

  enableTransformable(text);

  text.on('dblclick dbltap', () => {
    const absPos = text.getAbsolutePosition();
    const stageBox = stage.container().getBoundingClientRect();

    // 👇 Hide the canvas version while editing
    text.hide();
    layer.draw();
    
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    // Style the textarea
    textarea.value = text.text();
    textarea.style.position = 'absolute';
    textarea.style.top = `${stageBox.top + absPos.y}px`;
    textarea.style.left = `${stageBox.left + absPos.x}px`;
    textarea.style.width = `${text.width()}px`;
    textarea.style.height = `${text.height()}px`;
    textarea.style.fontSize = `${text.fontSize()}px`;
    textarea.style.fontFamily = text.fontFamily();
    textarea.style.color = text.fill();
    textarea.style.border = 'none';
    textarea.style.padding = '0px';
    textarea.style.margin = '0px';
    textarea.style.overflow = 'hidden';
    textarea.style.background = 'none';
    textarea.style.outline = 'none';
    textarea.style.resize = 'none';
    textarea.style.lineHeight = text.lineHeight();
    textarea.style.transform = `rotate(${text.rotation()}deg)`;
    textarea.style.transformOrigin = 'top left';
    textarea.style.textAlign = text.align();
    textarea.style.zIndex = 1000;

    textarea.focus();

    textarea.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        text.text(textarea.value);
        document.body.removeChild(textarea);
        text.show(); // 👈 show it again
        layer.draw();
      } else if (e.key === 'Escape') {
        document.body.removeChild(textarea);
      }
    });

    textarea.addEventListener('blur', function () {
      text.text(textarea.value);
      document.body.removeChild(textarea);
      text.show(); // 👈 show it again
      layer.draw();
    });
  });

  layer.add(text).draw();
};

window.addLine = function () {
  const x1 = snap(stage.width() / 2 - 80);
  const y1 = snap(2 * stage.height() / 3);
  const x2 = snap(stage.width() / 2 + 80);
  const y2 = y1;
  const pts = [x1, y1, x2, y2];

  const line = new Konva.Line({
    points: pts,
    stroke: 'black',
    strokeWidth: 2,
    hitStrokeWidth: 20,   // 👈 this is the fix: touch-friendly drag area
    draggable: true
  });

  line._originalStroke = line.stroke();

  const handleStart = createHandle(pts[0], pts[1], (x, y) => {
    line.points([x, y, line.points()[2], line.points()[3]]);
    if (line._touchHitStart) line._touchHitStart.position({ x, y });
    layer.batchDraw();
  });

  const handleEnd = createHandle(pts[2], pts[3], (x, y) => {
    line.points([line.points()[0], line.points()[1], x, y]);
    if (line._touchHitEnd) line._touchHitEnd.position({ x, y });
    layer.batchDraw();
  });

  const hitStart = createTouchHitZone(handleStart);
  const hitEnd = createTouchHitZone(handleEnd);

  line._extraHandles = [handleStart, handleEnd];
  line._touchHitStart = hitStart;
  line._touchHitEnd = hitEnd;

  const updateHandles = () => {
    const [x1, y1, x2, y2] = line.points();
    handleStart.position({ x: x1, y: y1 });
    handleEnd.position({ x: x2, y: y2 });
    hitStart.position({ x: x1, y: y1 });
    hitEnd.position({ x: x2, y: y2 });

    handleStart.moveToTop();
    handleEnd.moveToTop();
    hitStart.moveToTop();
    hitEnd.moveToTop();
  };

  line.on('click tap', () => {
    deselect();
    selectedShape = line;
    line.stroke('orange');
    line.draggable(false);

    if (!handleStart.getLayer()) layer.add(handleStart);
    if (!handleEnd.getLayer()) layer.add(handleEnd);
    if (!hitStart.getLayer()) layer.add(hitStart);
    if (!hitEnd.getLayer()) layer.add(hitEnd);

    handleStart.show();
    handleEnd.show();
    hitStart.show();
    hitEnd.show();

    updateHandles();
    line.moveToBottom();
    layer.batchDraw();
  });

  line.on('dragmove', updateHandles);

  line.on('dragend', () => {
  const offsetX = line.x();
  const offsetY = line.y();
  const [x1, y1, x2, y2] = line.points();

  const newPoints = [
    snap(x1 + offsetX),
    snap(y1 + offsetY),
    snap(x2 + offsetX),
    snap(y2 + offsetY)
  ];

  line.points(newPoints);
  line.position({ x: 0, y: 0 });

  if (selectedShape === line && line._extraHandles?.length === 2) {
    line._extraHandles[0].position({ x: newPoints[0], y: newPoints[1] });
    line._extraHandles[1].position({ x: newPoints[2], y: newPoints[3] });
    line._extraHandles[0].moveToTop();
    line._extraHandles[1].moveToTop();
  }

  if (line._touchHitStart) line._touchHitStart.position({ x: newPoints[0], y: newPoints[1] });
  if (line._touchHitEnd) line._touchHitEnd.position({ x: newPoints[2], y: newPoints[3] });

  layer.batchDraw();
  });

  snapLine(line);
  layer.add(line);
  line.moveToBottom();
  layer.draw();
};

window.addArrow = function () {
  const x1 = snap(stage.width() / 2);
  const y1 = snap(stage.height() / 2);
  const x2 = snap(x1 + 80);
  const y2 = y1;
  const pts = [x1, y1, x2, y2];

  const arrow = new Konva.Arrow({
    points: pts,
    stroke: 'red',
    fill: 'red',
    strokeWidth: 3,
    pointerLength: 10,
    pointerWidth: 10,
    hitStrokeWidth: 20,
    draggable: true
  });

  arrow._originalStroke = arrow.stroke();

  // Create persistent handles and hit zones
  const handleStart = createHandle(pts[0], pts[1], (x, y) => {
    const oldPts = arrow.points();
    arrow.points([x, y, oldPts[2], oldPts[3]]);
    if (arrow._touchHitStart) arrow._touchHitStart.position({ x, y });
    layer.batchDraw();
  });

  const handleEnd = createHandle(pts[2], pts[3], (x, y) => {
    const oldPts = arrow.points();
    arrow.points([oldPts[0], oldPts[1], x, y]);
    if (arrow._touchHitEnd) arrow._touchHitEnd.position({ x, y });
    layer.batchDraw();
  });

  // Add invisible touch hit zones for better mobile manipulation
  const hitStart = createTouchHitZone(handleStart);
  const hitEnd = createTouchHitZone(handleEnd);

  arrow._extraHandles = [handleStart, handleEnd];
  arrow._touchHitStart = hitStart;
  arrow._touchHitEnd = hitEnd;

  const updateHandles = () => {
    const [x1, y1, x2, y2] = arrow.points();
    handleStart.position({ x: x1, y: y1 });
    handleEnd.position({ x: x2, y: y2 });
    hitStart.position({ x: x1, y: y1 });
    hitEnd.position({ x: x2, y: y2 });

    // Always move to top
    handleStart.moveToTop();
    handleEnd.moveToTop();
    hitStart.moveToTop();
    hitEnd.moveToTop();
  };

  arrow.on('click tap', () => {
    deselect();
    selectedShape = arrow;
    arrow.stroke('orange');
    arrow.draggable(false);

    if (!handleStart.getLayer()) layer.add(handleStart);
    if (!handleEnd.getLayer()) layer.add(handleEnd);
    if (!hitStart.getLayer()) layer.add(hitStart);
    if (!hitEnd.getLayer()) layer.add(hitEnd);

    // 👇 SHOW everything that may have been hidden
    handleStart.show();
    handleEnd.show();
    hitStart.show();
    hitEnd.show();

    updateHandles();
    arrow.moveToBottom();
    layer.batchDraw();
  });

  arrow.on('dragmove', updateHandles);

  arrow.on('dragend', () => {
  const offsetX = arrow.x();
  const offsetY = arrow.y();
  const [x1, y1, x2, y2] = arrow.points();

  const newPoints = [
    snap(x1 + offsetX),
    snap(y1 + offsetY),
    snap(x2 + offsetX),
    snap(y2 + offsetY)
  ];

  arrow.points(newPoints);
  arrow.position({ x: 0, y: 0 });

  if (selectedShape === arrow && arrow._extraHandles?.length === 2) {
    arrow._extraHandles[0].position({ x: newPoints[0], y: newPoints[1] });
    arrow._extraHandles[1].position({ x: newPoints[2], y: newPoints[3] });
    arrow._extraHandles[0].moveToTop();
    arrow._extraHandles[1].moveToTop();
  }

  if (arrow._touchHitStart) arrow._touchHitStart.position({ x: newPoints[0], y: newPoints[1] });
  if (arrow._touchHitEnd) arrow._touchHitEnd.position({ x: newPoints[2], y: newPoints[3] });

  layer.batchDraw();
  });

  layer.add(arrow);
  arrow.moveToBottom();
  layer.draw();
};

window.addDashedArrow = function () {
  const x1 = snap(stage.width() / 2);
  const y1 = snap(stage.height() / 2);
  const x2 = x1
  const y2 = snap(y1 - 80);
  const pts = [x1, y1, x2, y2];

  const arrow = new Konva.Arrow({
    points: pts,
    stroke: '#666',
    fill: '#666',
    strokeWidth: 3,
    pointerLength: 10,
    pointerWidth: 10,
    hitStrokeWidth: 20,
    draggable: true,
    dash: [6, 4] // <- dashed stroke
  });

  arrow._originalStroke = arrow.stroke();

  // Create persistent handles and hit zones
  const handleStart = createHandle(pts[0], pts[1], (x, y) => {
    const oldPts = arrow.points();
    arrow.points([x, y, oldPts[2], oldPts[3]]);
    if (arrow._touchHitStart) arrow._touchHitStart.position({ x, y });
    layer.batchDraw();
  });

  const handleEnd = createHandle(pts[2], pts[3], (x, y) => {
    const oldPts = arrow.points();
    arrow.points([oldPts[0], oldPts[1], x, y]);
    if (arrow._touchHitEnd) arrow._touchHitEnd.position({ x, y });
    layer.batchDraw();
  });

  // Add invisible touch hit zones for better mobile manipulation
  const hitStart = createTouchHitZone(handleStart);
  const hitEnd = createTouchHitZone(handleEnd);

  arrow._extraHandles = [handleStart, handleEnd];
  arrow._touchHitStart = hitStart;
  arrow._touchHitEnd = hitEnd;

  const updateHandles = () => {
    const [x1, y1, x2, y2] = arrow.points();
    handleStart.position({ x: x1, y: y1 });
    handleEnd.position({ x: x2, y: y2 });
    hitStart.position({ x: x1, y: y1 });
    hitEnd.position({ x: x2, y: y2 });

    // Always move to top
    handleStart.moveToTop();
    handleEnd.moveToTop();
    hitStart.moveToTop();
    hitEnd.moveToTop();
  };

  arrow.on('click tap', () => {
    deselect();
    selectedShape = arrow;
    arrow.stroke('orange');
    arrow.draggable(false);

    if (!handleStart.getLayer()) layer.add(handleStart);
    if (!handleEnd.getLayer()) layer.add(handleEnd);
    if (!hitStart.getLayer()) layer.add(hitStart);
    if (!hitEnd.getLayer()) layer.add(hitEnd);

    // 👇 SHOW everything that may have been hidden
    handleStart.show();
    handleEnd.show();
    hitStart.show();
    hitEnd.show();

    updateHandles();
    arrow.moveToBottom();
    layer.batchDraw();
  });

  arrow.on('dragmove', updateHandles);

  arrow.on('dragend', () => {
  const offsetX = arrow.x();
  const offsetY = arrow.y();
  const [x1, y1, x2, y2] = arrow.points();

  const newPoints = [
    snap(x1 + offsetX),
    snap(y1 + offsetY),
    snap(x2 + offsetX),
    snap(y2 + offsetY)
  ];

  arrow.points(newPoints);
  arrow.position({ x: 0, y: 0 });

  if (selectedShape === arrow && arrow._extraHandles?.length === 2) {
    arrow._extraHandles[0].position({ x: newPoints[0], y: newPoints[1] });
    arrow._extraHandles[1].position({ x: newPoints[2], y: newPoints[3] });
    arrow._extraHandles[0].moveToTop();
    arrow._extraHandles[1].moveToTop();
  }

  if (arrow._touchHitStart) arrow._touchHitStart.position({ x: newPoints[0], y: newPoints[1] });
  if (arrow._touchHitEnd) arrow._touchHitEnd.position({ x: newPoints[2], y: newPoints[3] });

  layer.batchDraw();
  });

  layer.add(arrow);
  arrow.moveToBottom();
  layer.draw();
};

window.addEquation = function () {
  openMathModal();
};

// ============== Utility ==============

function createHandle(x, y, onDragMove) {
  const handle = new Konva.Circle({
    x,
    y,
    radius: 6,
    fill: '#ff0',
    stroke: '#000',
    strokeWidth: 1,
    draggable: true
  });

  handle.on('dragmove', () => {
    const newX = snap(handle.x());
    const newY = snap(handle.y());
    handle.position({ x: newX, y: newY });
    onDragMove(newX, newY);
  });

  return handle;
}

function createTouchHitZone(targetHandle) {
  const hit = new Konva.Circle({
    x: targetHandle.x(),
    y: targetHandle.y(),
    radius: 16,
    fill: 'rgba(0,0,0,0.01)', // invisible but interactive
    listening: true,
    draggable: true
  });

  hit.on('dragmove', () => {
    targetHandle.position({ x: snap(hit.x()), y: snap(hit.y()) });
    targetHandle.fire('dragmove'); // trigger handle logic
  });

  return hit;
}

function snapArrow(arrow) {
  const pts = arrow.points().map(snap);
  arrow.points(pts);
}

function snapLine(line) {
  const pts = line.points().map(snap);
  line.points(pts);
}

function enableTransformable(shape) {
  shape._originalStroke = shape.stroke();

  shape.on('click tap', () => {
    deselect();
    tr.nodes([shape]);
    selectedShape = shape;

    // Only highlight non-text shapes
    if (!(shape instanceof Konva.Text)) {
      shape.stroke('orange');
    }

    layer.batchDraw();
  });

  shape.on('dragmove', () => {
    shape.position({
      x: snap(shape.x()),
      y: snap(shape.y())
    });
  });

  shape.on('transformend', () => {
    const scaleX = shape.scaleX();
    const scaleY = shape.scaleY();
    shape.scale({ x: 1, y: 1 });

    if (shape instanceof Konva.Rect) {
      shape.width(snap(shape.width() * scaleX));
      shape.height(snap(shape.height() * scaleY));
    }

    if (shape instanceof Konva.Circle) {
      const avgScale = (scaleX + scaleY) / 2;
      shape.radius(snap(shape.radius() * avgScale));
    }

    layer.batchDraw();
  });
}

function deselect() {
  tr.nodes([]);

  if (selectedShape) {
    // Hide or destroy extra handles and touch zones
    if (selectedShape._extraHandles) {
      selectedShape._extraHandles.forEach(h => h.hide());
    }

    if (selectedShape._touchHitStart) {
      selectedShape._touchHitStart.hide();
    }

    if (selectedShape._touchHitEnd) {
      selectedShape._touchHitEnd.hide();
    }

    // Avoid applying stroke reset to Konva.Text
    if (!(selectedShape instanceof Konva.Text)) {
      selectedShape.stroke(selectedShape._originalStroke || 'black');
    }

    selectedShape.draggable(true);
    selectedShape = null;
    layer.batchDraw();
  }
}

window.deleteSelected = function () {
  if (!selectedShape) return;

  // Destroy touch handles and zones
  if (selectedShape._extraHandles) {
    selectedShape._extraHandles.forEach(h => h.destroy());
  }

  if (selectedShape._touchHitStart) {
    selectedShape._touchHitStart.destroy();
  }

  if (selectedShape._touchHitEnd) {
    selectedShape._touchHitEnd.destroy();
  }

  selectedShape.destroy();
  selectedShape = null;
  tr.nodes([]);
  layer.draw();
};

stage.on('click tap', (e) => {
  if (e.target === stage) deselect();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Delete') window.deleteSelected();
});

// ============== Tools ==============

function toggleGrid() {
  gridVisible = !gridVisible;
  gridLayer.visible(gridVisible);
  gridLayer.batchDraw();
}

window.addBox = function () {
  const w = stage.width();
  const h = stage.height();

  const rect = new Konva.Rect({
    x: w / 2 - 20,  // center the 40x40 box
    y: h / 2 - 20,
    width: 40,
    height: 40,
    fill: 'transparent',
    stroke: 'blue',
    strokeWidth: 2,
    draggable: true
  });

  enableTransformable(rect);
  layer.add(rect).draw();
};

window.addCircle = function () {
  const w = stage.width();
  const h = stage.height();

  const circ = new Konva.Circle({
    x: w / 2,
    y: h / 2,
    radius: 20,
    fill: 'transparent',
    stroke: 'green',
    strokeWidth: 2,
    draggable: true
  });

  enableTransformable(circ);
  layer.add(circ).draw();
};

window.addText = function () {
  const text = new Konva.Text({
    x: 100,
    y: 100,
    text: 'Label',
    fontSize: 20,
    fontFamily: 'Arial',
    fill: 'black',
    draggable: true
  });

  text._originalStroke = text.stroke();

  enableTransformable(text);

  text.on('dblclick dbltap', () => {
    const absPos = text.getAbsolutePosition();
    const stageBox = stage.container().getBoundingClientRect();

    // 👇 Hide the canvas version while editing
    text.hide();
    layer.draw();
    
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    // Style the textarea
    textarea.value = text.text();
    textarea.style.position = 'absolute';
    textarea.style.top = `${stageBox.top + absPos.y}px`;
    textarea.style.left = `${stageBox.left + absPos.x}px`;
    textarea.style.width = `${text.width()}px`;
    textarea.style.height = `${text.height()}px`;
    textarea.style.fontSize = `${text.fontSize()}px`;
    textarea.style.fontFamily = text.fontFamily();
    textarea.style.color = text.fill();
    textarea.style.border = 'none';
    textarea.style.padding = '0px';
    textarea.style.margin = '0px';
    textarea.style.overflow = 'hidden';
    textarea.style.background = 'none';
    textarea.style.outline = 'none';
    textarea.style.resize = 'none';
    textarea.style.lineHeight = text.lineHeight();
    textarea.style.transform = `rotate(${text.rotation()}deg)`;
    textarea.style.transformOrigin = 'top left';
    textarea.style.textAlign = text.align();
    textarea.style.zIndex = 1000;

    textarea.focus();

    textarea.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        text.text(textarea.value);
        document.body.removeChild(textarea);
        text.show(); // 👈 show it again
        layer.draw();
      } else if (e.key === 'Escape') {
        document.body.removeChild(textarea);
      }
    });

    textarea.addEventListener('blur', function () {
      text.text(textarea.value);
      document.body.removeChild(textarea);
      text.show(); // 👈 show it again
      layer.draw();
    });
  });

  layer.add(text).draw();
};

window.addLine = function () {
  const pts = [60, 120, 60, 240];

  const line = new Konva.Line({
    points: pts,
    stroke: 'black',
    strokeWidth: 2,
    hitStrokeWidth: 20,   // 👈 this is the fix: touch-friendly drag area
    draggable: true
  });

  line._originalStroke = line.stroke();

  const handleStart = createHandle(pts[0], pts[1], (x, y) => {
    line.points([x, y, line.points()[2], line.points()[3]]);
    if (line._touchHitStart) line._touchHitStart.position({ x, y });
    layer.batchDraw();
  });

  const handleEnd = createHandle(pts[2], pts[3], (x, y) => {
    line.points([line.points()[0], line.points()[1], x, y]);
    if (line._touchHitEnd) line._touchHitEnd.position({ x, y });
    layer.batchDraw();
  });

  const hitStart = createTouchHitZone(handleStart);
  const hitEnd = createTouchHitZone(handleEnd);

  line._extraHandles = [handleStart, handleEnd];
  line._touchHitStart = hitStart;
  line._touchHitEnd = hitEnd;

  const updateHandles = () => {
    const [x1, y1, x2, y2] = line.points();
    handleStart.position({ x: x1, y: y1 });
    handleEnd.position({ x: x2, y: y2 });
    hitStart.position({ x: x1, y: y1 });
    hitEnd.position({ x: x2, y: y2 });

    handleStart.moveToTop();
    handleEnd.moveToTop();
    hitStart.moveToTop();
    hitEnd.moveToTop();
  };

  line.on('click tap', () => {
    deselect();
    selectedShape = line;
    line.stroke('orange');
    line.draggable(false);

    if (!handleStart.getLayer()) layer.add(handleStart);
    if (!handleEnd.getLayer()) layer.add(handleEnd);
    if (!hitStart.getLayer()) layer.add(hitStart);
    if (!hitEnd.getLayer()) layer.add(hitEnd);

    handleStart.show();
    handleEnd.show();
    hitStart.show();
    hitEnd.show();

    updateHandles();
    line.moveToBottom();
    layer.batchDraw();
  });

  line.on('dragmove', updateHandles);

  line.on('dragend', () => {
  const offsetX = line.x();
  const offsetY = line.y();
  const [x1, y1, x2, y2] = line.points();

  const newPoints = [
    snap(x1 + offsetX),
    snap(y1 + offsetY),
    snap(x2 + offsetX),
    snap(y2 + offsetY)
  ];

  line.points(newPoints);
  line.position({ x: 0, y: 0 });

  if (selectedShape === line && line._extraHandles?.length === 2) {
    line._extraHandles[0].position({ x: newPoints[0], y: newPoints[1] });
    line._extraHandles[1].position({ x: newPoints[2], y: newPoints[3] });
    line._extraHandles[0].moveToTop();
    line._extraHandles[1].moveToTop();
  }

  if (line._touchHitStart) line._touchHitStart.position({ x: newPoints[0], y: newPoints[1] });
  if (line._touchHitEnd) line._touchHitEnd.position({ x: newPoints[2], y: newPoints[3] });

  layer.batchDraw();
  });

  snapLine(line);
  layer.add(line);
  line.moveToBottom();
  layer.draw();
};

window.addArrow = function () {
  const pts = [180, 180, 280, 180];

  const arrow = new Konva.Arrow({
    points: pts,
    stroke: 'red',
    fill: 'red',
    strokeWidth: 3,
    pointerLength: 10,
    pointerWidth: 10,
    hitStrokeWidth: 20,
    draggable: true
  });

  arrow._originalStroke = arrow.stroke();

  // Create persistent handles and hit zones
  const handleStart = createHandle(pts[0], pts[1], (x, y) => {
    const oldPts = arrow.points();
    arrow.points([x, y, oldPts[2], oldPts[3]]);
    if (arrow._touchHitStart) arrow._touchHitStart.position({ x, y });
    layer.batchDraw();
  });

  const handleEnd = createHandle(pts[2], pts[3], (x, y) => {
    const oldPts = arrow.points();
    arrow.points([oldPts[0], oldPts[1], x, y]);
    if (arrow._touchHitEnd) arrow._touchHitEnd.position({ x, y });
    layer.batchDraw();
  });

  // Add invisible touch hit zones for better mobile manipulation
  const hitStart = createTouchHitZone(handleStart);
  const hitEnd = createTouchHitZone(handleEnd);

  arrow._extraHandles = [handleStart, handleEnd];
  arrow._touchHitStart = hitStart;
  arrow._touchHitEnd = hitEnd;

  const updateHandles = () => {
    const [x1, y1, x2, y2] = arrow.points();
    handleStart.position({ x: x1, y: y1 });
    handleEnd.position({ x: x2, y: y2 });
    hitStart.position({ x: x1, y: y1 });
    hitEnd.position({ x: x2, y: y2 });

    // Always move to top
    handleStart.moveToTop();
    handleEnd.moveToTop();
    hitStart.moveToTop();
    hitEnd.moveToTop();
  };

  arrow.on('click tap', () => {
    deselect();
    selectedShape = arrow;
    arrow.stroke('orange');
    arrow.draggable(false);

    if (!handleStart.getLayer()) layer.add(handleStart);
    if (!handleEnd.getLayer()) layer.add(handleEnd);
    if (!hitStart.getLayer()) layer.add(hitStart);
    if (!hitEnd.getLayer()) layer.add(hitEnd);

    // 👇 SHOW everything that may have been hidden
    handleStart.show();
    handleEnd.show();
    hitStart.show();
    hitEnd.show();

    updateHandles();
    arrow.moveToBottom();
    layer.batchDraw();
  });

  arrow.on('dragmove', updateHandles);

  arrow.on('dragend', () => {
  const offsetX = arrow.x();
  const offsetY = arrow.y();
  const [x1, y1, x2, y2] = arrow.points();

  const newPoints = [
    snap(x1 + offsetX),
    snap(y1 + offsetY),
    snap(x2 + offsetX),
    snap(y2 + offsetY)
  ];

  arrow.points(newPoints);
  arrow.position({ x: 0, y: 0 });

  if (selectedShape === arrow && arrow._extraHandles?.length === 2) {
    arrow._extraHandles[0].position({ x: newPoints[0], y: newPoints[1] });
    arrow._extraHandles[1].position({ x: newPoints[2], y: newPoints[3] });
    arrow._extraHandles[0].moveToTop();
    arrow._extraHandles[1].moveToTop();
  }

  if (arrow._touchHitStart) arrow._touchHitStart.position({ x: newPoints[0], y: newPoints[1] });
  if (arrow._touchHitEnd) arrow._touchHitEnd.position({ x: newPoints[2], y: newPoints[3] });

  layer.batchDraw();
  });

  layer.add(arrow);
  arrow.moveToBottom();
  layer.draw();
};

window.addDashedArrow = function () {
  const pts = [180, 180, 280, 180];

  const arrow = new Konva.Arrow({
    points: pts,
    stroke: '#666',
    fill: '#666',
    strokeWidth: 3,
    pointerLength: 10,
    pointerWidth: 10,
    hitStrokeWidth: 20,
    draggable: true,
    dash: [6, 4] // <- dashed stroke
  });

  arrow._originalStroke = arrow.stroke();

  // Create persistent handles and hit zones
  const handleStart = createHandle(pts[0], pts[1], (x, y) => {
    const oldPts = arrow.points();
    arrow.points([x, y, oldPts[2], oldPts[3]]);
    if (arrow._touchHitStart) arrow._touchHitStart.position({ x, y });
    layer.batchDraw();
  });

  const handleEnd = createHandle(pts[2], pts[3], (x, y) => {
    const oldPts = arrow.points();
    arrow.points([oldPts[0], oldPts[1], x, y]);
    if (arrow._touchHitEnd) arrow._touchHitEnd.position({ x, y });
    layer.batchDraw();
  });

  // Add invisible touch hit zones for better mobile manipulation
  const hitStart = createTouchHitZone(handleStart);
  const hitEnd = createTouchHitZone(handleEnd);

  arrow._extraHandles = [handleStart, handleEnd];
  arrow._touchHitStart = hitStart;
  arrow._touchHitEnd = hitEnd;

  const updateHandles = () => {
    const [x1, y1, x2, y2] = arrow.points();
    handleStart.position({ x: x1, y: y1 });
    handleEnd.position({ x: x2, y: y2 });
    hitStart.position({ x: x1, y: y1 });
    hitEnd.position({ x: x2, y: y2 });

    // Always move to top
    handleStart.moveToTop();
    handleEnd.moveToTop();
    hitStart.moveToTop();
    hitEnd.moveToTop();
  };

  arrow.on('click tap', () => {
    deselect();
    selectedShape = arrow;
    arrow.stroke('orange');
    arrow.draggable(false);

    if (!handleStart.getLayer()) layer.add(handleStart);
    if (!handleEnd.getLayer()) layer.add(handleEnd);
    if (!hitStart.getLayer()) layer.add(hitStart);
    if (!hitEnd.getLayer()) layer.add(hitEnd);

    // 👇 SHOW everything that may have been hidden
    handleStart.show();
    handleEnd.show();
    hitStart.show();
    hitEnd.show();

    updateHandles();
    arrow.moveToBottom();
    layer.batchDraw();
  });

  arrow.on('dragmove', updateHandles);

  arrow.on('dragend', () => {
  const offsetX = arrow.x();
  const offsetY = arrow.y();
  const [x1, y1, x2, y2] = arrow.points();

  const newPoints = [
    snap(x1 + offsetX),
    snap(y1 + offsetY),
    snap(x2 + offsetX),
    snap(y2 + offsetY)
  ];

  arrow.points(newPoints);
  arrow.position({ x: 0, y: 0 });

  if (selectedShape === arrow && arrow._extraHandles?.length === 2) {
    arrow._extraHandles[0].position({ x: newPoints[0], y: newPoints[1] });
    arrow._extraHandles[1].position({ x: newPoints[2], y: newPoints[3] });
    arrow._extraHandles[0].moveToTop();
    arrow._extraHandles[1].moveToTop();
  }

  if (arrow._touchHitStart) arrow._touchHitStart.position({ x: newPoints[0], y: newPoints[1] });
  if (arrow._touchHitEnd) arrow._touchHitEnd.position({ x: newPoints[2], y: newPoints[3] });

  layer.batchDraw();
  });

  layer.add(arrow);
  arrow.moveToBottom();
  layer.draw();
};

window.addEquation = function () {
  openMathModal();
};

// ============== Utility ==============

function createHandle(x, y, onDragMove) {
  const handle = new Konva.Circle({
    x,
    y,
    radius: 6,
    fill: '#ff0',
    stroke: '#000',
    strokeWidth: 1,
    draggable: true
  });

  handle.on('dragmove', () => {
    const newX = snap(handle.x());
    const newY = snap(handle.y());
    handle.position({ x: newX, y: newY });
    onDragMove(newX, newY);
  });

  return handle;
}

function createTouchHitZone(targetHandle) {
  const hit = new Konva.Circle({
    x: targetHandle.x(),
    y: targetHandle.y(),
    radius: 16,
    fill: 'rgba(0,0,0,0.01)', // invisible but interactive
    listening: true,
    draggable: true
  });

  hit.on('dragmove', () => {
    targetHandle.position({ x: snap(hit.x()), y: snap(hit.y()) });
    targetHandle.fire('dragmove'); // trigger handle logic
  });

  return hit;
}

function snapArrow(arrow) {
  const pts = arrow.points().map(snap);
  arrow.points(pts);
}

function snapLine(line) {
  const pts = line.points().map(snap);
  line.points(pts);
}

function enableTransformable(shape) {
  shape._originalStroke = shape.stroke();

  shape.on('click tap', () => {
    deselect();
    tr.nodes([shape]);
    selectedShape = shape;

    // Only highlight non-text shapes
    if (!(shape instanceof Konva.Text)) {
      shape.stroke('orange');
    }

    layer.batchDraw();
  });

  shape.on('dragmove', () => {
    shape.position({
      x: snap(shape.x()),
      y: snap(shape.y())
    });
  });

  shape.on('transformend', () => {
    const scaleX = shape.scaleX();
    const scaleY = shape.scaleY();
    shape.scale({ x: 1, y: 1 });

    if (shape instanceof Konva.Rect) {
      shape.width(snap(shape.width() * scaleX));
      shape.height(snap(shape.height() * scaleY));
    }

    if (shape instanceof Konva.Circle) {
      const avgScale = (scaleX + scaleY) / 2;
      shape.radius(snap(shape.radius() * avgScale));
    }

    layer.batchDraw();
  });
}

function deselect() {
  tr.nodes([]);

  if (selectedShape) {
    // Hide or destroy extra handles and touch zones
    if (selectedShape._extraHandles) {
      selectedShape._extraHandles.forEach(h => h.hide());
    }

    if (selectedShape._touchHitStart) {
      selectedShape._touchHitStart.hide();
    }

    if (selectedShape._touchHitEnd) {
      selectedShape._touchHitEnd.hide();
    }

    // Avoid applying stroke reset to Konva.Text
    if (!(selectedShape instanceof Konva.Text)) {
      selectedShape.stroke(selectedShape._originalStroke || 'black');
    }

    selectedShape.draggable(true);
    selectedShape = null;
    layer.batchDraw();
  }
}

window.deleteSelected = function () {
  if (!selectedShape) return;

  // Destroy touch handles and zones
  if (selectedShape._extraHandles) {
    selectedShape._extraHandles.forEach(h => h.destroy());
  }

  if (selectedShape._touchHitStart) {
    selectedShape._touchHitStart.destroy();
  }

  if (selectedShape._touchHitEnd) {
    selectedShape._touchHitEnd.destroy();
  }

  selectedShape.destroy();
  selectedShape = null;
  tr.nodes([]);
  layer.draw();
};

stage.on('click tap', (e) => {
  if (e.target === stage) deselect();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Delete') window.deleteSelected();
});

let currentEquationNode = null;

// --- LaTeX Math Modal
function openMathModal(existingNode = null) {
  currentEquationNode = existingNode;
  const modal = document.getElementById('mathModal');
  const input = document.getElementById('latexInput');
  const preview = document.getElementById('preview');

  input.value = existingNode?._latexSource || '';
  preview.innerHTML = '';

  modal.style.display = 'block';

  input.oninput = () => {
    try {
      preview.innerHTML = katex.renderToString(input.value, { throwOnError: false });
    } catch (e) {
      preview.innerHTML = `<span style="color:red;">Invalid LaTeX</span>`;
    }
  };

  input.oninput(); // render initial
  input.focus();
}

function closeMathModal() {
  document.getElementById('mathModal').style.display = 'none';
  currentEquationNode = null;
}

function insertEquation() {
  const input = document.getElementById('latexInput');
  const latex = input.value;

  // Render to SVG
  const html = katex.renderToString(latex, { output: 'html', throwOnError: false });
  const svgContainer = document.createElement('div');
  svgContainer.innerHTML = html;
  const svg = svgContainer.querySelector('span');

  // Convert to image
  html2canvas(svg, { backgroundColor: null }).then(canvas => {
    const dataURL = canvas.toDataURL();

    const img = new Image();
    img.onload = () => {
      const konvaImage = new Konva.Image({
        x: snap(stage.width() / 2 - img.width / 2),
        y: snap(stage.height() / 3 - img.height / 2),
        image: img,
        draggable: true
      });

      konvaImage._latexSource = latex;

      konvaImage.on('dblclick dbltap', () => openMathModal(konvaImage));

      if (currentEquationNode) {
        currentEquationNode.image(img);
        currentEquationNode._latexSource = latex;
        currentEquationNode.getLayer().batchDraw();
      } else {
        layer.add(konvaImage);
        layer.draw();
      }

      closeMathModal();
    };
    img.src = dataURL;
  });
}

