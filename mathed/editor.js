const renderedField = document.getElementById('renderedField');
const ghostInput = document.getElementById('ghostInput');

let tokens = [];
let caretPath = [0];
let latexBuffer = null;
let typedBuffer = '';

function resolvePath(path) {
  let ref = tokens;
  for (let i = 0; i < path.length - 1; i++) ref = ref[path[i]];
  return { ref, index: path[path.length - 1] };
}

function tokenToLatex(token) {
  if (!token) return '';

  switch (token.type) {
    case 'latex':
      try {
        katex.__parse(token.value);
        return token.value;
      } catch {
        return `\\textcolor{red}{${token.value}}`;
      }

    case 'frac':
      return `\\frac{${(token.left || []).map((t, i, arr) => {
        const prev = arr[i - 1];
        const needsSpace = prev?.type === 'latex' && (t.type === 'char' || t.type === 'caret');
        return (needsSpace ? ' ' : '') + tokenToLatex(t);
      }).join('')}}{${(token.right || []).map((t, i, arr) => {
        const prev = arr[i - 1];
        const needsSpace = prev?.type === 'latex' && (t.type === 'char' || t.type === 'caret');
        return (needsSpace ? ' ' : '') + tokenToLatex(t);
      }).join('')}}`;

    case 'sup':
      return `${(token.base || []).map(tokenToLatex).join('')}^{${(token.exponent || []).map((t, i, arr) => {
        const prev = arr[i - 1];
        const needsSpace = prev?.type === 'latex' && (t.type === 'char' || t.type === 'caret');
        return (needsSpace ? ' ' : '') + tokenToLatex(t);
      }).join('')}}`;

    case 'sub':
      return `${(token.base || []).map(tokenToLatex).join('')}_{${(token.sub || []).map((t, i, arr) => {
        const prev = arr[i - 1];
        const needsSpace = prev?.type === 'latex' && (t.type === 'char' || t.type === 'caret');
        return (needsSpace ? ' ' : '') + tokenToLatex(t);
      }).join('')}}`;

    case 'group':
      return `\\left(${(token.tokens || []).map((t, i, arr) => {
        const prev = arr[i - 1];
        const needsSpace = prev?.type === 'latex' && (t.type === 'char' || t.type === 'caret');
        return (needsSpace ? ' ' : '') + tokenToLatex(t);
      }).join('')}\\right)`;

    case 'caret':
      if (!latexBuffer) return '\\textcolor{gray}{|}';

      const raw = latexBuffer.trim();
      const match = raw.match(/^\\[a-zA-Z]{1,}$/);
      return match
        ? `\\textcolor{gray}{${raw}}`
        : `\\textcolor{gray}{|}`;

    case 'char':
    default:
      return token.latex || '';

    case 'root':
      if (token.index && token.index.length > 0) {
        return `\\sqrt[${token.index.map((t, i, arr) => {
          const prev = arr[i - 1];
          const needsSpace = prev?.type === 'latex' && (t.type === 'char' || t.type === 'caret');
          return (needsSpace ? ' ' : '') + tokenToLatex(t);
        }).join('')}]{${
          token.radicand.map((t, i, arr) => {
            const prev = arr[i - 1];
            const needsSpace = prev?.type === 'latex' && (t.type === 'char' || t.type === 'caret');
            return (needsSpace ? ' ' : '') + tokenToLatex(t);
          }).join('')
        }}`;
      } else {
        return `\\sqrt{${token.radicand.map((t, i, arr) => {
          const prev = arr[i - 1];
          const needsSpace = prev?.type === 'latex' && (t.type === 'char' || t.type === 'caret');
          return (needsSpace ? ' ' : '') + tokenToLatex(t);
        }).join('')}}`;
      }

    case 'func':
      return `\\${token.name}\\left(${(token.arg || []).map((t, i, arr) => {
        const prev = arr[i - 1];
        const needsSpace = prev?.type === 'latex' && (t.type === 'char' || t.type === 'caret');
        return (needsSpace ? ' ' : '') + tokenToLatex(t);
      }).join('')}\\right)`;

    case 'accent':
      return `\\${token.accent}{${(token.arg || []).map((t, i, arr) => {
        const prev = arr[i - 1];
        const needsSpace = prev?.type === 'latex' && (t.type === 'char' || t.type === 'caret');
        return (needsSpace ? ' ' : '') + tokenToLatex(t);
      }).join('')}}`;

    case 'latex-preview':
      const escaped = token.value.replace(/\\/g, '\\textbackslash ');
      return `\\textcolor{gray}{\\texttt{${escaped}}}`;

    case 'text':
      return `\\text{${token.content.map(tokenToLatex).join('')}}`;
  }
}

function renderTokensWithCaret(tokens, path) {
  const deepCopy = JSON.parse(JSON.stringify(tokens));
  let ref = deepCopy;
  for (let i = 0; i < path.length - 1; i++) ref = ref[path[i]];
  if (latexBuffer !== null) {
    ref.splice(path[path.length - 1], 0, {
      type: 'latex-preview',
      value: latexBuffer
    });
  } else {
  ref.splice(path[path.length - 1], 0, { type: 'caret' });
}

  return deepCopy;
}

function render() {
  renderedField.innerHTML = '';

  if (tokens.length === 0 && (!latexBuffer || latexBuffer.length === 0)) {
    const placeholder = document.createElement('span');
    placeholder.style.color = 'gray';
    placeholder.textContent = 'Start typing...';
    const caret = document.createElement('span');
    caret.className = 'caret-blink';
    renderedField.appendChild(placeholder);
    renderedField.appendChild(caret);
    return;
  }

  const withCaret = renderTokensWithCaret([...tokens], caretPath);
  let latex = '';
    for (let i = 0; i < withCaret.length; i++) {
      const curr = withCaret[i];
      const prev = withCaret[i - 1];
      if (prev?.type === 'latex' && (curr.type === 'char' || curr.type === 'caret')) latex += ' ';
      latex += tokenToLatex(curr);
    }

  if (latexBuffer && latexBuffer.length > 1) {
  const ghost = document.createElement('span');
  ghost.style.color = 'gray';
  ghost.style.fontFamily = 'monospace';
  ghost.style.marginLeft = '4px';
  ghost.textContent = latexBuffer;
  renderedField.appendChild(ghost);
}

  try {
    katex.render(latex, renderedField, { throwOnError: false });
  } catch {
    renderedField.innerHTML = '<span style="color:red">[Invalid Expression]</span>';
  }
}

function insertChar(char) {
  // Start new latex buffer
  if (char === '\\') {
    latexBuffer = '\\';
    render();
    return;
  }

  // Continue latex buffer
  if (latexBuffer !== null) {
    if (char === ' ') {
      const { ref, index } = resolvePath(caretPath);
      const match = latexBuffer.match(/^\\([a-zA-Z]+)$/);
      const command = match ? match[1] : null;

      let newToken = null;
      if (['sin', 'cos', 'tan', 'log', 'ln'].includes(command)) {
        newToken = { type: 'func', name: command, arg: [] };
        caretPath = caretPath.slice(0, -1).concat(index, 'arg', 0);
      } else if (['vec', 'hat', 'bar', 'dot'].includes(command)) {
        newToken = { type: 'accent', accent: command, arg: [] };
        caretPath = caretPath.slice(0, -1).concat(index, 'arg', 0);
      } else if (command === 'sqrt') {
        newToken = { type: 'root', radicand: [] };
        caretPath = caretPath.slice(0, -1).concat(index, 'radicand', 0);
      }

      if (newToken) {
        ref.splice(index, 0, newToken);
      } else {
        ref.splice(index, 0, { type: 'latex', value: latexBuffer });

        // Make sure the caret moves one slot after the inserted token
        // and NEVER accidentally appends to it
        if (ref.length > index + 1) {
          caretPath = caretPath.slice(0, -1).concat(index + 1);
        } else {
          caretPath = caretPath.slice(0, -1).concat(ref.length);
        }
      }

      latexBuffer = null;
      render();
      return;
    } else {
      latexBuffer += char;
      render();
      return;
    }
  }

  // If we're about to insert and the caret is right after a latex token,
  // advance to ensure we don't append into the same structure
  const before = resolvePath(caretPath.slice(0, -1).concat(caretPath[caretPath.length - 1] - 1));
  if (before.ref?.[before.index]?.type === 'latex') {
    caretPath[caretPath.length - 1]++;
  }

  // Everything else needs resolved ref
  const { ref, index } = resolvePath(caretPath);

  // Handle structural characters
  if (char === '^') {
    const base = ref.splice(index - 1, 1);
    const sup = { type: 'sup', base, exponent: [] };
    ref.splice(index - 1, 0, sup);
    caretPath = caretPath.slice(0, -1).concat(index - 1, 'exponent', 0);
    render();
    return;
  }

  if (char === '_') {
    const base = ref.splice(index - 1, 1);
    const sub = { type: 'sub', base, sub: [] };
    ref.splice(index - 1, 0, sub);
    caretPath = caretPath.slice(0, -1).concat(index - 1, 'sub', 0);
    render();
    return;
  }

  if (char === '/') {
    const left = ref.splice(index - 1, 1);
    const frac = { type: 'frac', left, right: [] };
    ref.splice(index - 1, 0, frac);
    caretPath = caretPath.slice(0, -1).concat(index - 1, 'right', 0);
    render();
    return;
  }

  if (char === '(') {
    const group = { type: 'group', tokens: [] };
    ref.splice(index, 0, group);
    caretPath = caretPath.slice(0, -1).concat(index, 'tokens', 0);
    render();
    return;
  }

  if (char === ')') {
    const groupIndex = caretPath.lastIndexOf('tokens');
    if (groupIndex !== -1) {
      caretPath = caretPath.slice(0, groupIndex).concat(caretPath[groupIndex - 1] + 1);
      render();
      return;
    }
  }

  if (char === '#') {
    const root = { type: 'root', radicand: [] };
    ref.splice(index, 0, root);
    caretPath = caretPath.slice(0, -1).concat(index, 'radicand', 0);
    render();
    return;
  }

  // Regular char
  ref.splice(index, 0, { type: 'char', latex: char });
  caretPath[caretPath.length - 1]++;
  render();
}

function deleteChar() {
  const { ref, index } = resolvePath(caretPath);
  if (latexBuffer !== null) {
    latexBuffer = latexBuffer.slice(0, -1);
    if (latexBuffer.length === 0) latexBuffer = null;
    render(); return;
  }
  if (index > 0) {
    ref.splice(index - 1, 1);
    caretPath[caretPath.length - 1]--;
    render();
  }
}

function commitLatexBuffer() {
  if (!latexBuffer) return false;

  const { ref, index } = resolvePath(caretPath);
  const command = latexBuffer.trim().replace(/^\\/, '');
  let newToken = null;

  if (['sin', 'cos', 'tan', 'log', 'ln'].includes(command)) {
    newToken = { type: 'func', name: command, arg: [] };
    caretPath = caretPath.slice(0, -1).concat(index, 'arg', 0);
  } else if (['vec', 'hat', 'bar', 'dot'].includes(command)) {
    newToken = { type: 'accent', accent: command, arg: [] };
    caretPath = caretPath.slice(0, -1).concat(index, 'arg', 0);
  } else if (command === 'sqrt') {
    newToken = { type: 'root', radicand: [] };
    caretPath = caretPath.slice(0, -1).concat(index, 'radicand', 0);
  } else if (command === 'text') {
    newToken = { type: 'text', content: [] };
    ref.splice(index, 0, newToken);
    caretPath = caretPath.slice(0, -1).concat(index, 'content', 0);
  }

  if (newToken) {
    ref.splice(index, 0, newToken);
  } else {
    // fallback: insert raw LaTeX + dummy to prevent glue-on (\pi e → \pie)
    ref.splice(index, 0,
      { type: 'latex', value: `${latexBuffer}` },   // ← keep latex, no {}
      { type: 'char', latex: '' }                   // ← dummy buffer absorber
    );
    caretPath = caretPath.slice(0, -1).concat(index + 1); // land on dummy
  }

  latexBuffer = null;
  return true;
}

function diveIntoStructure(token, path, dir) {
  if (!token) return null;
  const fields = {
    frac: dir < 0 ? ['right', 'left'] : ['left', 'right'],
    sup: ['exponent'],
    sub: ['sub'],
    group: ['tokens'],
    root: ['radicand'],
    func: ['arg'],
    accent: ['arg']
  };
  const keys = fields[token.type];
  if (keys) {
    for (const key of keys) {
      if (Array.isArray(token[key])) {
        const target = token[key];
        return path.concat(key, dir < 0 ? target.length : 0);
      }
    }
  }
  return null;
}

function moveCaret(dir) {
  const path = [...caretPath];
  const { ref, index } = resolvePath(path);

  // ✅ Patch: Emergency escape if caret is stuck after a latex token
  if (dir > 0 && index === ref.length && ref[index - 1]?.type === 'latex') {
    for (let i = path.length - 2; i >= 0; i -= 2) {
      const parentPath = path.slice(0, i);
      const { ref: pRef, index: pIdx } = resolvePath(parentPath);
      if (Array.isArray(pRef)) {
        caretPath = parentPath.slice(0, -1).concat(pIdx + 1);
        render();
        return;
      }
    }
  }

  const diveIdx = dir > 0 ? index : index - 1;
  const diveToken = ref[diveIdx];
  const divePath = diveIntoStructure(diveToken, path.slice(0, -1).concat(diveIdx), dir);
  if (divePath) {
    caretPath = divePath;
    render(); return;
  }

  const newIndex = index + dir;
  if (newIndex >= 0 && newIndex <= ref.length) {
    caretPath = path.slice(0, -1).concat(newIndex);
    render(); return;
  }

  for (let i = path.length - 2; i >= 0; i -= 2) {
    const parentPath = path.slice(0, i);
    const { ref: pRef, index: pIdx } = resolvePath(parentPath);
    const fieldKey = path[i];
    const siblings = {
      frac: ['left', 'right'],
      sup: ['base', 'exponent'],
      sub: ['base', 'sub'],
      group: ['tokens'],
      root: ['index', 'radicand'],
      func: ['arg'],
      accent: ['arg']
    };
    const container = pRef[pIdx];
    if (container?.type && siblings[container.type]) {
      const fields = siblings[container.type];
      const fieldIdx = fields.indexOf(fieldKey);
      const targetField = fields[fieldIdx + dir];
      if (targetField && Array.isArray(container[targetField])) {
        caretPath = parentPath.concat(targetField, dir > 0 ? 0 : container[targetField].length);
        render(); return;
      }
    }

    if ((dir < 0 && index === 0) || (dir > 0 && index === ref.length)) {
      caretPath = parentPath.slice(0, -1).concat(dir > 0 ? pIdx + 1 : pIdx);
      render(); return;
    }
  }
}

renderedField.addEventListener('click', () => ghostInput.focus());

ghostInput.addEventListener('input', e => {
  const val = ghostInput.value;
  ghostInput.value = '';

  if (val === ' ') {
    const committed = commitLatexBuffer();

    const { ref, index } = resolvePath(caretPath);
    const token = ref[index];

    // 🧠 If we’re sitting on a dummy char, move past it
    if (token?.type === 'char' && token.latex === '') {
      moveCaret(1);
      render();
      return;
    }

    if (!committed) moveCaret(1);
    render();
    return;
  }

  if (val) insertChar(val);
});

ghostInput.addEventListener('keydown', e => {
  if (['ArrowLeft', 'ArrowRight', 'Backspace'].includes(e.key)) {
    typedBuffer = '';
  }

  if (e.key === 'Backspace') {
    e.preventDefault(); deleteChar();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault(); moveCaret(-1);
  } else if (e.key === 'ArrowRight') {
    e.preventDefault(); moveCaret(1);
  }
});

renderedField.addEventListener('focus', () => ghostInput.focus());
window.addEventListener('DOMContentLoaded', () => {
  ghostInput.focus();
  render();
});
