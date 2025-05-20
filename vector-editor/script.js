// Final polish: arrowhead fix + auto-select after draw
const svgNS = "http://www.w3.org/2000/svg";
const canvas = document.getElementById("canvas");
let currentTool = "select";

let isDrawing = false;
let startX = 0, startY = 0;
let currentElement = null;
let selectedElement = null;
let offsetX = 0, offsetY = 0;
let dragOffset = {};
let justDrew = false;

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

document.getElementById("delete").addEventListener("click", () => {
  if (selectedElement) {
    canvas.removeChild(selectedElement);
    selectedElement = null;
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
  justDrew = false;

  if (currentTool === "select") {
    let target = e.target.closest("g, line, rect, circle, text");
    if (target && target !== canvas) {
      if (target.tagName !== "g" && target.parentNode.tagName === "g") {
        target = target.parentNode;
      }
      selectedElement = target;
      highlightSelection(selectedElement);

      if (selectedElement.tagName === "text") {
        offsetX = x - parseFloat(selectedElement.getAttribute("x"));
        offsetY = y - parseFloat(selectedElement.getAttribute("y"));
      } else if (selectedElement.tagName === "circle") {
        offsetX = x - parseFloat(selectedElement.getAttribute("cx"));
        offsetY = y - parseFloat(selectedElement.getAttribute("cy"));
      } else if (selectedElement.tagName === "rect") {
        offsetX = x - parseFloat(selectedElement.getAttribute("x"));
        offsetY = y - parseFloat(selectedElement.getAttribute("y"));
      } else if (selectedElement.tagName === "g") {
        const main = selectedElement.querySelector("line:last-child");
        dragOffset = {
          x1: parseFloat(main.getAttribute("x1")),
          y1: parseFloat(main.getAttribute("y1")),
          x2: parseFloat(main.getAttribute("x2")),
          y2: parseFloat(main.getAttribute("y2")),
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

      const color = currentTool === "vector" ? "red" : "black";
      main.setAttribute("stroke", color);
      main.setAttribute("stroke-width", "2");
      main.setAttribute("stroke-linecap", "round");
      main.setAttribute("data-original-stroke", color);

      if (currentTool === "vector") {
        main.setAttribute("marker-end", "url(#arrowhead)");
      }

      group.appendChild(shadow);
      group.appendChild(main);
      canvas.appendChild(group);
      currentElement = group;
      selectedElement = group;
      justDrew = true;
      break;
    }
    case "box": {
      const rect = document.createElementNS(svgNS, "rect");
      rect.setAttribute("x", x);
      rect.setAttribute("y", y);
      rect.setAttribute("width", 0);
      rect.setAttribute("height", 0);
      rect.setAttribute("fill", "#4444ff33");
      rect.setAttribute("stroke", "blue");
      canvas.appendChild(rect);
      currentElement = rect;
      selectedElement = rect;
      justDrew = true;
      break;
    }
    case "circle": {
      const circ = document.createElementNS(svgNS, "circle");
      circ.setAttribute("cx", x);
      circ.setAttribute("cy", y);
      circ.setAttribute("r", 0);
      circ.setAttribute("fill", "#00aa0033");
      circ.setAttribute("stroke", "green");
      canvas.appendChild(circ);
      currentElement = circ;
      selectedElement = circ;
      justDrew = true;
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
        selectedElement = t;
        highlightSelection(t);
        justDrew = true;
      }
      isDrawing = false;
      currentElement = null;
      currentTool = "select";
      return;
    }
  }
}

canvas.addEventListener("mousemove", dragDraw);
canvas.addEventListener("touchmove", dragDraw);

function dragDraw(e) {
  if (!isDrawing || !currentElement) return;
  const { x, y } = getCoords(e);

  if (currentElement.tagName === "g") {
    const [shadow, main] = currentElement.querySelectorAll("line");
    shadow.setAttribute("x2", x);
    shadow.setAttribute("y2", y);
    main.setAttribute("x2", x);
    main.setAttribute("y2", y);
  } else if (currentElement.tagName === "rect") {
    currentElement.setAttribute("width", Math.abs(x - startX));
    currentElement.setAttribute("height", Math.abs(y - startY));
    currentElement.setAttribute("x", Math.min(x, startX));
    currentElement.setAttribute("y", Math.min(y, startY));
  } else if (currentElement.tagName === "circle") {
    const dx = x - startX;
    const dy = y - startY;
    currentElement.setAttribute("r", Math.sqrt(dx * dx + dy * dy));
  }
}

canvas.addEventListener("mouseup", () => {
  isDrawing = false;
  currentElement = null;
  if (justDrew && selectedElement) {
    highlightSelection(selectedElement);
    currentTool = "select";
  }
});

canvas.addEventListener("touchend", () => {
  isDrawing = false;
  currentElement = null;
  if (justDrew && selectedElement) {
    highlightSelection(selectedElement);
    currentTool = "select";
  }
});

function clearSelection() {
  if (selectedElement) {
    if (selectedElement.tagName === "g") {
      const main = selectedElement.querySelector("line:last-child");
      const original = main.getAttribute("data-original-stroke") || "black";
      main.setAttribute("stroke", original);
    } else {
      selectedElement.removeAttribute("stroke");
    }
    selectedElement = null;
  }
}

function highlightSelection(el) {
  clearSelection();
  if (el.tagName === "g") {
    const main = el.querySelector("line:last-child");
    main.setAttribute("stroke", "orange");
  } else {
    el.setAttribute("stroke", "orange");
  }
  selectedElement = el;
}

// Ensure arrowhead marker is first in SVG
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
canvas.insertBefore(defs, canvas.firstChild);
