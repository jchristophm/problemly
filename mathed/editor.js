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
    case 'accent': return `\\${token.accent}{${(token.arg || []).map(tokenToLatex).join('')}}`;
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

function insertChar(char) {
  const { ref, index } = resolvePath(caretPath);

  // Start new latex buffer
  if (char === '\\') {
    latexBuffer = '\\';
    render();
    return;
  }

  // Continue latex buffer
  if (latexBuffer !== null) {
    if (char === ' ') {
      const match = latexBuffer.match(/^\\([a-zA-Z]+)$/);
      const command = match ? match[1] : null;

      let newToken = null;
      if (['sin', 'cos', 'tan', 'log', 'ln'].includes(command)) {
        newToken = { type: 'func', name: command, arg: [] };
      } else if (['vec', 'hat', 'bar', 'dot'].includes(command)) {
        newToken = { type: 'accent', accent: command, arg: [] };
      } else if (command === 'sqrt') {
        newToken = { type: 'root', radicand: [] };
      }

      if (newToken) {
        ref.splice(index, 0, newToken);

        if (newToken.type === 'func') {
          caretPath = caretPath.slice(0, -1).concat(index, 'arg', 0);
        } else if (newToken.type === 'accent') {
          caretPath = caretPath.slice(0, -1).concat(index, 'arg', 0);
        } else if (newToken.type === 'root') {
          caretPath = caretPath.slice(0, -1).concat(index, 'radicand', 0);
        } else {
          caretPath[caretPath.length - 1]++;
        }

        latexBuffer = null;
        render();
        return;
      } else {
        // Fallback to raw LaTeX insert
        ref.splice(index, 0, { type: 'latex', value: latexBuffer });
        caretPath[caretPath.length - 1]++;
        latexBuffer = null;
        render();
        return;
      }
    } else {
      latexBuffer += char;
      render();
      return;
    }
  }

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
    const committed = commitLatexBuffer();
    if (!committed) moveCaret(1); // Advance caret if nothing to commit
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
