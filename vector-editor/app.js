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
  const points = [60, 60, 160, 160];
  const line = new Konva.Line({
    points,
    stroke: 'black',
    strokeWidth: 2,
    hitStrokeWidth: 20
  });

  const p1 = createHandle(points[0], points[1], (x, y) => {
    line.points([x, y, line.points()[2], line.points()[3]]);
    snapLine(line);
    layer.batchDraw();
  });

  const p2 = createHandle(points[2], points[3], (x, y) => {
    line.points([line.points()[0], line.points()[1], x, y]);
    snapLine(line);
    layer.batchDraw();
  });

  line.on('click tap', () => {
    deselect();
    selectedShape = line;
    selectedShape._extraHandles = [p1, p2];
    selectedShape.stroke('orange');
    layer.batchDraw();
  });

  snapLine(line);
  layer.add(line, p1, p2).draw();
};

window.addArrow = function () {
  const points = [80, 80, 180, 180];

  const arrow = new Konva.Arrow({
    points,
    stroke: 'red',
    fill: 'red',
    strokeWidth: 3,
    pointerLength: 10,
    pointerWidth: 10,
    hitStrokeWidth: 20
  });

  const p1 = createHandle(points[0], points[1], (x, y) => {
    arrow.points([x, y, arrow.points()[2], arrow.points()[3]]);
    snapArrow(arrow);
    layer.batchDraw();
  });

  const p2 = createHandle(points[2], points[3], (x, y) => {
    arrow.points([arrow.points()[0], arrow.points()[1], x, y]);
    snapArrow(arrow);
    layer.batchDraw();
  });

  arrow.on('click tap', () => {
    deselect();
    selectedShape = arrow;
    selectedShape._extraHandles = [p1, p2];
    selectedShape.stroke('orange');
    layer.batchDraw();
  });

  snapArrow(arrow);
  layer.add(arrow, p1, p2).draw();
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
    selectedShape.stroke(selectedShape._originalStroke || 'black');
    if (selectedShape._extraHandles) {
      selectedShape._extraHandles.forEach(h => h.destroy());
    }
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
