const svgNS = "http://www.w3.org/2000/svg";
const canvas = document.getElementById("canvas");
let currentTool = "select";

// Track current state
let isDrawing = false;
let startX = 0, startY = 0;
let currentElement = null;

document.getElementById("toolbar").addEventListener("click", (e) => {
  if (e.target.dataset.tool) {
    currentTool = e.target.dataset.tool;
  }
});

canvas.addEventListener("mousedown", (e) => {
  const rect = canvas.getBoundingClientRect();
  startX = e.clientX - rect.left;
  startY = e.clientY - rect.top;
  isDrawing = true;

  switch (currentTool) {
    case "vector":
      currentElement = document.createElementNS(svgNS, "line");
      currentElement.setAttribute("x1", startX);
      currentElement.setAttribute("y1", startY);
      currentElement.setAttribute("x2", startX);
      currentElement.setAttribute("y2", startY);
      currentElement.setAttribute("stroke", "red");
      currentElement.setAttribute("marker-end", "url(#arrowhead)");
      canvas.appendChild(currentElement);
      break;

    case "box":
      currentElement = document.createElementNS(svgNS, "rect");
      currentElement.setAttribute("x", startX);
      currentElement.setAttribute("y", startY);
      currentElement.setAttribute("width", 0);
      currentElement.setAttribute("height", 0);
      currentElement.setAttribute("fill", "#4444ff33");
      currentElement.setAttribute("stroke", "blue");
      canvas.appendChild(currentElement);
      break;

    case "circle":
      currentElement = document.createElementNS(svgNS, "circle");
      currentElement.setAttribute("cx", startX);
      currentElement.setAttribute("cy", startY);
      currentElement.setAttribute("r", 0);
      currentElement.setAttribute("fill", "#00aa0033");
      currentElement.setAttribute("stroke", "green");
      canvas.appendChild(currentElement);
      break;

    case "line":
      currentElement = document.createElementNS(svgNS, "line");
      currentElement.setAttribute("x1", startX);
      currentElement.setAttribute("y1", startY);
      currentElement.setAttribute("x2", startX);
      currentElement.setAttribute("y2", startY);
      currentElement.setAttribute("stroke", "black");
      canvas.appendChild(currentElement);
      break;

    case "text":
      const text = prompt("Enter label text:");
      if (text) {
        const t = document.createElementNS(svgNS, "text");
        t.setAttribute("x", startX);
        t.setAttribute("y", startY);
        t.setAttribute("fill", "black");
        t.textContent = text;
        canvas.appendChild(t);
      }
      isDrawing = false;
      break;

    case "coords1D":
      draw1DAxis();
      isDrawing = false;
      break;

    case "coords2D":
      draw2DAxis();
      isDrawing = false;
      break;
  }
});

canvas.addEventListener("mousemove", (e) => {
  if (!isDrawing || !currentElement) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  switch (currentElement.tagName) {
    case "line":
      currentElement.setAttribute("x2", x);
      currentElement.setAttribute("y2", y);
      break;
    case "rect":
      currentElement.setAttribute("width", Math.abs(x - startX));
      currentElement.setAttribute("height", Math.abs(y - startY));
      break;
    case "circle":
      const dx = x - startX;
      const dy = y - startY;
      currentElement.setAttribute("r", Math.sqrt(dx * dx + dy * dy));
      break;
  }
});

canvas.addEventListener("mouseup", () => {
  isDrawing = false;
  currentElement = null;
});

document.getElementById("export").addEventListener("click", () => {
  const svgData = canvas.outerHTML;
  const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "diagram.svg";
  link.click();
});

function draw1DAxis() {
  const axis = document.createElementNS(svgNS, "line");
  axis.setAttribute("x1", "20");
  axis.setAttribute("y1", "240");
  axis.setAttribute("x2", "300");
  axis.setAttribute("y2", "240");
  axis.setAttribute("stroke", "gray");
  axis.setAttribute("marker-end", "url(#arrowhead)");
  canvas.appendChild(axis);
  const label = document.createElementNS(svgNS, "text");
  label.setAttribute("x", "280");
  label.setAttribute("y", "230");
  label.textContent = "+x";
  label.setAttribute("fill", "gray");
  canvas.appendChild(label);
}

function draw2DAxis() {
  draw1DAxis();
  const yAxis = document.createElementNS(svgNS, "line");
  yAxis.setAttribute("x1", "160");
  yAxis.setAttribute("y1", "20");
  yAxis.setAttribute("x2", "160");
  yAxis.setAttribute("y2", "460");
  yAxis.setAttribute("stroke", "gray");
  yAxis.setAttribute("marker-end", "url(#arrowhead)");
  canvas.appendChild(yAxis);
  const label = document.createElementNS(svgNS, "text");
  label.setAttribute("x", "170");
  label.setAttribute("y", "40");
  label.textContent = "+y";
  label.setAttribute("fill", "gray");
  canvas.appendChild(label);
}

// Add arrowhead marker definition
const defs = document.createElementNS(svgNS, "defs");
const marker = document.createElementNS(svgNS, "marker");
marker.setAttribute("id", "arrowhead");
marker.setAttribute("markerWidth", "10");
marker.setAttribute("markerHeight", "7");
marker.setAttribute("refX", "10");
marker.setAttribute("refY", "3.5");
marker.setAttribute("orient", "auto");
const path = document.createElementNS(svgNS, "path");
path.setAttribute("d", "M0,0 L10,3.5 L0,7 Z");
path.setAttribute("fill", "gray");
marker.appendChild(path);
defs.appendChild(marker);
canvas.appendChild(defs);
