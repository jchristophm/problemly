// push render wtf
const renderedField = document.getElementById('renderedField');
const ghostInput = document.getElementById('ghostInput');

let tokens = [];
let caretPath = [0];
let latexBuffer = null;

function resolvePath(path) {
  let ref = tokens;
  for (let i = 0; i < path.length - 1; i++) ref = ref[path[i]];
  return { ref, index: path[path.length - 1] };
}

function tokenToLatex(token) {
  if (!token) return '';
  switch (token.type) {
    case 'latex':
      try { katex.__parse(token.value); return token.value; }
      catch { return `\\textcolor{red}{${token.value}}`; }
    case 'frac': return `\\frac{${(token.left || []).map(tokenToLatex).join('')}}{${(token.right || []).map(tokenToLatex).join('')}}`;
    case 'sup': return `${(token.base || []).map(tokenToLatex).join('')}^{${(token.exponent || []).map(tokenToLatex).join('')}}`;
    case 'sub': return `${(token.base || []).map(tokenToLatex).join('')}_{${(token.sub || []).map(tokenToLatex).join('')}}`;
    case 'group': return `\\left(${(token.tokens || []).map(tokenToLatex).join('')}\\right)`;
    case 'caret': return '\\textcolor{gray}{|}';
    case 'char': default: return token.latex || '';
    case 'root':
      if (token.index && token.index.length > 0) {
        return `\\sqrt[${token.index.map(tokenToLatex).join('')}]{${
          token.radicand.map(tokenToLatex).join('')
        }}`;
      } else {
        return `\\sqrt{${token.radicand.map(tokenToLatex).join('')}}`;
      }
    case 'func': return `\\${token.name}\\left(${(token.arg || []).map(tokenToLatex).join('')}\\right)`;
  }
}

function renderTokensWithCaret(tokens, path) {
  const deepCopy = JSON.parse(JSON.stringify(tokens));
  let ref = deepCopy;
  for (let i = 0; i < path.length - 1; i++) ref = ref[path[i]];
  ref.splice(path[path.length - 1], 0, { type: 'caret' });
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

  try {
    katex.render(latex, renderedField, { throwOnError: false });
  } catch {
    renderedField.innerHTML = '<span style="color:red">[Invalid Expression]</span>';
  }

  if (latexBuffer && latexBuffer.length > 0) {
    const ghost = document.createElement('span');
    ghost.style.color = 'gray';
    ghost.style.fontFamily = 'monospace';
    ghost.style.marginLeft = '4px';
    ghost.textContent = latexBuffer;
    const caret = document.createElement('span');
    caret.className = 'caret-blink';
    renderedField.appendChild(ghost);
    renderedField.appendChild(caret);
  }
}

function getRecentChars(latestChar, lookback = 3) {
  const { ref, index } = resolvePath(caretPath);
  const prefix = ref.slice(Math.max(0, index - lookback), index).map(t => t?.latex || '').join('');
  return (prefix + latestChar).toLowerCase();
}

function insertChar(char) {
  // --- FUNCTION TRIGGERS: sin, cos, tan ---
  const fnNames = ['sin', 'cos', 'tan'];
  if (tokens.length >= 3) {
    const recent = getRecentChars(char, 3);
    if (fnNames.includes(recent)) {
      const { ref, index } = resolvePath(caretPath);
      const insertAt = index - 3;

      // Extra guard to be safe
      if (insertAt < 0 || ref.length < 3) {
        console.warn("Function insertion skipped: not enough tokens before caret.");
        return;
      }

      ref.splice(insertAt, 3);
      const funcToken = { type: 'func', name: recent, arg: [] };
      ref.splice(insertAt, 0, funcToken);
      caretPath = caretPath.slice(0, -1).concat(insertAt, 'arg', 0);
      render();
      return;
    }
  }
  
  const { ref, index } = resolvePath(caretPath);
  if (char === '\\') {
    latexBuffer = '\\';
    render(); return;
  }
  if (latexBuffer !== null && latexBuffer.length > 0) {
    if (char === ' ') {
      ref.splice(index, 0, { type: 'latex', value: latexBuffer });
      caretPath[caretPath.length - 1]++;
      latexBuffer = null;
      render(); return;
    } else {
      latexBuffer += char;
      render(); return;
    }
  }

  if (char === '^') {
    const base = ref.splice(index - 1, 1);
    const sup = { type: 'sup', base, exponent: [] };
    ref.splice(index - 1, 0, sup);
    caretPath = caretPath.slice(0, -1).concat(index - 1, 'exponent', 0);
    render(); return;
  }
  if (char === '_') {
    const base = ref.splice(index - 1, 1);
    const sub = { type: 'sub', base, sub: [] };
    ref.splice(index - 1, 0, sub);
    caretPath = caretPath.slice(0, -1).concat(index - 1, 'sub', 0);
    render(); return;
  }
  if (char === '/') {
    const left = ref.splice(index - 1, 1);
    const frac = { type: 'frac', left, right: [] };
    ref.splice(index - 1, 0, frac);
    caretPath = caretPath.slice(0, -1).concat(index - 1, 'right', 0);
    render(); return;
  }
  if (char === '(') {
    const group = { type: 'group', tokens: [] };
    ref.splice(index, 0, group);
    caretPath = caretPath.slice(0, -1).concat(index, 'tokens', 0);
    render(); return;
  }
  if (char === ')') {
    const groupIndex = caretPath.lastIndexOf('tokens');
    if (groupIndex !== -1) {
      caretPath = caretPath.slice(0, groupIndex).concat(caretPath[groupIndex - 1] + 1);
      render(); return;
    }
  }
  if (char === '#') {
    const root = { type: 'root', radicand: [] };
    ref.splice(index, 0, root);
      caretPath = caretPath.slice(0, -1).concat(index, 'radicand', 0);
      render(); return;
  }

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
  ref.splice(index, 0, { type: 'latex', value: latexBuffer });
  latexBuffer = null;
  caretPath = caretPath.slice(0, -1).concat(index + 1);
  return true;
}

function diveIntoStructure(token, path, dir) {
  if (!token) return null;
  const fields = {
    frac: dir < 0 ? ['right', 'left'] : ['left', 'right'],
    sup: ['exponent'],
    sub: ['sub'],
    group: ['tokens'],
    root: ['radicand']
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
      group: ['tokens']
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
    if (latexBuffer !== null) {
      commitLatexBuffer();
      latexBuffer = null;
      render();
    } else {
      moveCaret(1);
    }
    return;
  }
  if (val) insertChar(val);
});

ghostInput.addEventListener('keydown', e => {
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
  render(); // <- Add this line
});

