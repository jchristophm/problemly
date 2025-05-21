const width = 360;
const height = 360;
const gridSize = 20;

const stage = new Konva.Stage({
  container: 'container',
  width,
  height
});

const layer = new Konva.Layer();
stage.add(layer);

const tr = new Konva.Transformer({
  rotateEnabled: true,
  ignoreStroke: true,
  padding: 4
});
layer.add(tr);

let selectedShape = null;

function snap(val) {
  return Math.round(val / gridSize) * gridSize;
}

// ============== Tools ==============

window.addBox = function () {
  const rect = new Konva.Rect({
    x: 60,
    y: 60,
    width: 80,
    height: 60,
    fill: '#99f',
    stroke: 'blue',
    strokeWidth: 2,
    draggable: true
  });
  enableTransformable(rect);
  layer.add(rect).draw();
};

window.addCircle = function () {
  const circ = new Konva.Circle({
    x: 100,
    y: 100,
    radius: 30,
    fill: '#9f9',
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
    fontSize: 16,
    fill: 'black',
    draggable: true
  });
  enableTransformable(text);
  layer.add(text).draw();
};

window.addLine = function () {
  const pts = [60, 60, 160, 160];

  const line = new Konva.Line({
    points: pts,
    stroke: 'black',
    strokeWidth: 2
  });

  const hitbox = new Konva.Line({
    points: pts,
    strokeWidth: 20,
    stroke: 'rgba(0,0,0,0.001)',
    listening: true
  });

  const p1 = createHandle(pts[0], pts[1], (x, y) => {
    line.points([x, y, line.points()[2], line.points()[3]]);
    hitbox.points(line.points());
    snapLine(line);
    layer.batchDraw();
  });

  const p2 = createHandle(pts[2], pts[3], (x, y) => {
    line.points([line.points()[0], line.points()[1], x, y]);
    hitbox.points(line.points());
    snapLine(line);
    layer.batchDraw();
  });

  hitbox.on('click tap', () => {
    deselect();
    selectedShape = line;
    line.stroke('orange');
    selectedShape._extraHandles = [p1, p2];
    layer.batchDraw();
  });

  snapLine(line);
  layer.add(line, hitbox, p1, p2).draw();
};

window.addArrow = function () {
  const pts = [80, 80, 180, 180];

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

  const handleStart = createHandle(pts[0], pts[1], (x, y) => {
    const oldPts = arrow.points();
    arrow.points([x, y, oldPts[2], oldPts[3]]);
    layer.batchDraw();
  });

  const handleEnd = createHandle(pts[2], pts[3], (x, y) => {
    const oldPts = arrow.points();
    arrow.points([oldPts[0], oldPts[1], x, y]);
    layer.batchDraw();
  });

  arrow.on('click tap', () => {
    deselect();
    selectedShape = arrow;
    arrow.stroke('orange');
    arrow.draggable(false); // disable dragging while endpoints are active
    arrow._extraHandles = [handleStart, handleEnd];

    // Position handles at arrow ends
    const [x1, y1, x2, y2] = arrow.points();
    handleStart.position({ x: x1, y: y1 });
    handleEnd.position({ x: x2, y: y2 });

    // Add handles above arrow
    layer.add(handleStart, handleEnd);
    handleStart.moveToTop();
    handleEnd.moveToTop();
    layer.batchDraw();
  });

  arrow.on('dragmove', () => {
  // Live update handle positions if selected
  if (selectedShape === arrow && arrow._extraHandles) {
    const [x1, y1, x2, y2] = arrow.points();
    arrow._extraHandles[0].position({ x: x1, y: y1 });
    arrow._extraHandles[1].position({ x: x2, y: y2 });
    layer.batchDraw();
  }
});

arrow.on('dragend', () => {
  const offsetX = arrow.x();
  const offsetY = arrow.y();
  const [x1, y1, x2, y2] = arrow.points();

  // Update points to reflect moved position
  const newPoints = [
    x1 + offsetX,
    y1 + offsetY,
    x2 + offsetX,
    y2 + offsetY
  ];
  arrow.points(newPoints);
  arrow.position({ x: 0, y: 0 }); // clear transform

  // If selected, update handles too
  if (selectedShape === arrow && arrow._extraHandles) {
    arrow._extraHandles[0].position({ x: newPoints[0], y: newPoints[1] });
    arrow._extraHandles[1].position({ x: newPoints[2], y: newPoints[3] });
  }

  layer.batchDraw();
});

  layer.add(arrow);
  arrow.moveToBottom(); // make sure handles appear on top later
  layer.draw();
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
    shape.stroke('orange');
    layer.batchDraw();
  });

  shape.on('dragmove', () => {
    shape.position({
      x: snap(shape.x()),
      y: snap(shape.y())
    });
  });
}

function deselect() {
  tr.nodes([]);
  if (selectedShape) {
    if (selectedShape._extraHandles) {
      selectedShape._extraHandles.forEach(h => h.destroy());
      selectedShape._extraHandles = [];
    }
    selectedShape.stroke(selectedShape._originalStroke || 'black');
    selectedShape.draggable(true); // re-enable drag after deselect
    selectedShape = null;
    layer.batchDraw();
  }
}

window.deleteSelected = function () {
  if (!selectedShape) return;
  if (selectedShape._extraHandles) {
    selectedShape._extraHandles.forEach(h => h.destroy());
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
