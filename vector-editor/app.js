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

let selectedShape = null;

function snap(val) {
  return Math.round(val / gridSize) * gridSize;
}

// ============== Tools ==============

window.addBox = function () {
  const rect = new Konva.Rect({
    x: 60, y: 60,
    width: 80, height: 60,
    fill: '#99f',
    stroke: 'blue',
    strokeWidth: 2,
    draggable: true
  });
  enableSelect(rect);
  layer.add(rect).draw();
};

window.addCircle = function () {
  const circ = new Konva.Circle({
    x: 100, y: 100,
    radius: 30,
    fill: '#9f9',
    stroke: 'green',
    strokeWidth: 2,
    draggable: true
  });
  enableSelect(circ);
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
  enableSelect(text);
  layer.add(text).draw();
};

window.addLine = function () {
  const line = new Konva.Line({
    points: [50, 50, 150, 150],
    stroke: 'black',
    strokeWidth: 2,
    draggable: true
  });
  enableSelect(line);
  layer.add(line).draw();
};

window.addArrow = function () {
  const points = [80, 80, 180, 180];

  const arrow = new Konva.Arrow({
    points,
    stroke: 'red',
    fill: 'red',
    strokeWidth: 3,
    pointerLength: 10,
    pointerWidth: 10
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

  enableSelect(arrow, [p1, p2]);
  layer.add(arrow, p1, p2).draw();
};

function snapArrow(arrow) {
  const pts = arrow.points().map(snap);
  arrow.points(pts);
}

// ============== Utils ==============

function createHandle(x, y, onDragMove) {
  const handle = new Konva.Circle({
    x, y,
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

function enableSelect(shape, extra = []) {
  shape._originalStroke = shape.stroke();
  shape.on('click tap', () => {
    selectShape(shape, extra);
  });

  shape.on('dragmove', () => {
    shape.position({
      x: snap(shape.x()),
      y: snap(shape.y())
    });
  });
}

function selectShape(shape, extraHandles = []) {
  if (selectedShape && selectedShape !== shape) {
    deselect();
  }
  selectedShape = shape;
  shape.stroke('orange');
  shape.draw();
  selectedShape._extraHandles = extraHandles;
}

function deselect() {
  if (!selectedShape) return;
  selectedShape.stroke(selectedShape._originalStroke || 'black');
  layer.batchDraw();
  if (selectedShape._extraHandles) {
    selectedShape._extraHandles.forEach(h => h.destroy());
  }
  selectedShape = null;
}

window.deleteSelected = function () {
  if (!selectedShape) return;
  if (selectedShape._extraHandles) {
    selectedShape._extraHandles.forEach(h => h.destroy());
  }
  selectedShape.destroy();
  selectedShape = null;
  layer.draw();
};

stage.on('click tap', (e) => {
  if (e.target === stage) deselect();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Delete') window.deleteSelected();
});
