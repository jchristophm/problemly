// Final fix: dragDraw updates all tools properly again
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
      justDrew = true;
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
      justDrew = true;
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
        justDrew = true;
      }
      isDrawing = false;
      currentElement = null;
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
  if (justDrew) currentTool = "select";
});

canvas.addEventListener("touchend", () => {
  isDrawing = false;
  currentElement = null;
  if (justDrew) currentTool = "select";
});
