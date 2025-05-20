// Updated script.js: fixed vector fatness and disappearing on drag
const svgNS = "http://www.w3.org/2000/svg";
const canvas = document.getElementById("canvas");
let currentTool = "select";

let isDrawing = false;
let startX = 0, startY = 0;
let currentElement = null;
let selectedElement = null;
let offsetX = 0, offsetY = 0;
let dragOffset = {};

function getCoords(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: clientX - rect.left,
    y: clientY - rect.top
  };
}

document.getElementById("toolbar").addEventListener("click", (e) => {
  if (e.target.dataset.tool) {
    currentTool = e.target.dataset.tool;
    clearSelection();
  }
});

canvas.addEventListener("mousedown", startDraw);
canvas.addEventListener("touchstart", startDraw);

function startDraw(e) {
  e.preventDefault();
  const { x, y } = getCoords(e);
  startX = x;
  startY = y;
  isDrawing = true;

  if (currentTool === "select") {
    const target = e.target.closest("line, rect, circle, text");
    if (target && target !== canvas) {
      selectedElement = target;
      selectedElement.setAttribute("stroke", "orange");

      if (selectedElement.tagName === "text") {
        offsetX = x - parseFloat(selectedElement.getAttribute("x"));
        offsetY = y - parseFloat(selectedElement.getAttribute("y"));
      } else if (selectedElement.tagName === "circle") {
        offsetX = x - parseFloat(selectedElement.getAttribute("cx"));
        offsetY = y - parseFloat(selectedElement.getAttribute("cy"));
      } else if (selectedElement.tagName === "rect") {
        offsetX = x - parseFloat(selectedElement.getAttribute("x"));
        offsetY = y - parseFloat(selectedElement.getAttribute("y"));
      } else if (selectedElement.tagName === "line") {
        dragOffset = {
          x1: parseFloat(selectedElement.getAttribute("x1")),
          y1: parseFloat(selectedElement.getAttribute("y1")),
          x2: parseFloat(selectedElement.getAttribute("x2")),
          y2: parseFloat(selectedElement.getAttribute("y2")),
          dx: x,
          dy: y
        };
      }
    } else {
      clearSelection();
    }
    return;
  }

  switch (currentTool) {
    case "vector":
    case "line": {
      const group = document.createElementNS(svgNS, "g");
      const shadow = document.createElementNS(svgNS, "line");
      const main = document.createElementNS(svgNS, "line");

      [shadow, main].forEach(line => {
        line.setAttribute("x1", x);
        line.setAttribute("y1", y);
        line.setAttribute("x2", x);
        line.setAttribute("y2", y);
      });

      shadow.setAttribute("stroke", "transparent");
      shadow.setAttribute("stroke-width", "10");
      shadow.setAttribute("pointer-events", "stroke");

      main.setAttribute("stroke", currentTool === "vector" ? "red" : "black");
      main.setAttribute("stroke-width", "2");
      main.setAttribute("stroke-linecap", "round");
      if (currentTool === "vector") {
        main.setAttribute("marker-end", "url(#arrowhead)");
      }

      group.appendChild(shadow);
      group.appendChild(main);
      canvas.appendChild(group);
      currentElement = group;
      break;
    }
    case "box": {
      currentElement = document.createElementNS(svgNS, "rect");
      currentElement.setAttribute("x", x);
      currentElement.setAttribute("y", y);
      currentElement.setAttribute("width", 0);
      currentElement.setAttribute("height", 0);
      currentElement.setAttribute("fill", "#4444ff33");
      currentElement.setAttribute("stroke", "blue");
      canvas.appendChild(currentElement);
      break;
    }
    case "circle": {
      currentElement = document.createElementNS(svgNS, "circle");
      currentElement.setAttribute("cx", x);
      currentElement.setAttribute("cy", y);
      currentElement.setAttribute("r", 0);
      currentElement.setAttribute("fill", "#00aa0033");
      currentElement.setAttribute("stroke", "green");
      canvas.appendChild(currentElement);
      break;
    }
    case "text": {
      const text = prompt("Enter label text:");
      if (text) {
        const t = document.createElementNS(svgNS, "text");
        t.setAttribute("x", x);
        t.setAttribute("y", y);
        t.setAttribute("fill", "black");
        t.textContent = text;
        canvas.appendChild(t);
      }
      isDrawing = false;
      break;
    }
  }
}

canvas.addEventListener("mousemove", dragDraw);
canvas.addEventListener("touchmove", dragDraw);

function dragDraw(e) {
  if (!isDrawing) return;
  const { x, y } = getCoords(e);

  if (currentTool === "select" && selectedElement) {
    if (selectedElement.tagName === "text") {
      selectedElement.setAttribute("x", x - offsetX);
      selectedElement.setAttribute("y", y - offsetY);
    } else if (selectedElement.tagName === "circle") {
      selectedElement.setAttribute("cx", x - offsetX);
      selectedElement.setAttribute("cy", y - offsetY);
    } else if (selectedElement.tagName === "rect") {
      selectedElement.setAttribute("x", x - offsetX);
      selectedElement.setAttribute("y", y - offsetY);
    } else if (selectedElement.tagName === "line") {
      const dx = x - dragOffset.dx;
      const dy = y - dragOffset.dy;
      const x1 = dragOffset.x1 + dx;
      const y1 = dragOffset.y1 + dy;
      const x2 = dragOffset.x2 + dx;
      const y2 = dragOffset.y2 + dy;
      selectedElement.setAttribute("x1", x1);
      selectedElement.setAttribute("y1", y1);
      selectedElement.setAttribute("x2", x2);
      selectedElement.setAttribute("y2", y2);
    }
    return;
  }

  if (!currentElement) return;

  if (currentElement.tagName === "g") {
    const [shadow, main] = currentElement.querySelectorAll("line");
    shadow.setAttribute("x2", x);
    shadow.setAttribute("y2", y);
    main.setAttribute("x2", x);
    main.setAttribute("y2", y);
  }
  else if (currentElement.tagName === "rect") {
    currentElement.setAttribute("width", Math.abs(x - startX));
    currentElement.setAttribute("height", Math.abs(y - startY));
  }
  else if (currentElement.tagName === "circle") {
    const dx = x - startX;
    const dy = y - startY;
    currentElement.setAttribute("r", Math.sqrt(dx * dx + dy * dy));
  }
}

canvas.addEventListener("mouseup", () => {
  isDrawing = false;
  currentElement = null;
});
canvas.addEventListener("touchend", () => {
  isDrawing = false;
  currentElement = null;
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Delete" && selectedElement) {
    if (selectedElement.parentNode.tagName === "g") {
      selectedElement.parentNode.remove();
    } else {
      canvas.removeChild(selectedElement);
    }
    selectedElement = null;
  }
});

function clearSelection() {
  if (selectedElement) {
    selectedElement.removeAttribute("stroke");
    selectedElement = null;
  }
}

document.getElementById("export").addEventListener("click", () => {
  const svgData = canvas.outerHTML;
  const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "diagram.svg";
  link.click();
});

// Arrowhead marker definition
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
