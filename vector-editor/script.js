// Load Fabric.js
const script = document.createElement('script');
script.src = 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js';
script.onload = initializeEditor;
document.head.appendChild(script);

function initializeEditor() {
  const canvas = new fabric.Canvas('c', {
    selection: true,
    preserveObjectStacking: true
  });

  function snap(obj) {
    const grid = 20;
    obj.set({
      left: Math.round(obj.left / grid) * grid,
      top: Math.round(obj.top / grid) * grid
    });
  }

  canvas.on('object:moving', e => snap(e.target));
  canvas.on('object:scaling', e => snap(e.target));
  canvas.on('object:rotating', e => snap(e.target));

  window.addLine = function () {
    const line = new fabric.Line([50, 50, 150, 150], {
      stroke: 'black', strokeWidth: 2,
      hasBorders: false, hasControls: true
    });
    canvas.add(line);
  };

  window.addArrow = function () {
    const line = new fabric.Line([50, 50, 150, 150], {
      stroke: 'red', strokeWidth: 2
    });
    const head = new fabric.Triangle({
      left: 145, top: 145, angle: 45,
      width: 10, height: 10, fill: 'red',
      originX: 'center', originY: 'center'
    });
    const group = new fabric.Group([line, head], { selectable: true });
    canvas.add(group);
  };

  window.addBox = function () {
    const rect = new fabric.Rect({
      width: 80, height: 60, fill: '#99f',
      left: 60, top: 60, stroke: 'blue',
      strokeWidth: 2
    });
    canvas.add(rect);
  };

  window.addCircle = function () {
    const circle = new fabric.Circle({
      radius: 30, fill: '#9f9',
      left: 120, top: 120, stroke: 'green',
      strokeWidth: 2
    });
    canvas.add(circle);
  };

  window.addText = function () {
    const text = new fabric.Textbox("Label", {
      left: 100, top: 100,
      fontSize: 16, fill: 'black'
    });
    canvas.add(text);
  };

  window.deleteSelected = function () {
    const active = canvas.getActiveObject();
    if (active) canvas.remove(active);
  };

  document.addEventListener('keydown', e => {
    if (e.key === 'Delete') window.deleteSelected();
  });
}

