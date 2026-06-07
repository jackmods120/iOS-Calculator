/* ===========================
   iOS Calculator — script.js
   Full logic with iOS-accurate
   operator-highlight behaviour
   =========================== */

'use strict';

// ── State ──────────────────────────────────────────────
const state = {
  current: '0',      // what's shown in result
  previous: null,    // first operand (string)
  operator: null,    // pending operator symbol
  justEvaluated: false,  // did we just press "="?
  freshOperand: false,   // waiting for second operand input
};

// ── DOM refs ────────────────────────────────────────────
const resultEl    = document.getElementById('result');
const expressionEl = document.getElementById('expression');
const clearBtn    = document.getElementById('clear-btn');

// ── Helpers ─────────────────────────────────────────────

/** Format a number the iOS way: strip trailing zeros, cap length */
function formatDisplay(value) {
  const num = parseFloat(value);
  if (isNaN(num)) return 'Error';

  // Handle very large / very small: use exponential
  if (Math.abs(num) >= 1e16 || (Math.abs(num) < 1e-6 && num !== 0)) {
    return num.toExponential(6).replace(/\.?0+e/, 'e');
  }

  // Limit to 9 significant digits like the real app
  let s = parseFloat(num.toPrecision(9)).toString();
  return s;
}

/** Shrink the result font when text gets long */
function adjustResultFont(text) {
  resultEl.classList.remove('shrink-3', 'shrink-4', 'shrink-5');
  const len = text.replace('.', '').replace('-', '').length;
  if (len >= 10) resultEl.classList.add('shrink-5');
  else if (len >= 8) resultEl.classList.add('shrink-4');
  else if (len >= 6) resultEl.classList.add('shrink-3');
}

/** Update the display */
function updateDisplay() {
  const display = formatDisplay(state.current);
  resultEl.textContent = display;
  adjustResultFont(display);

  // Expression line
  if (state.operator && state.previous !== null) {
    expressionEl.textContent = `${formatDisplay(state.previous)}${state.operator}`;
  } else {
    expressionEl.textContent = '';
  }

  // AC vs C
  clearBtn.textContent = state.current === '0' && !state.previous ? 'AC' : 'C';
}

/** Highlight the active operator button */
function highlightOperator(op) {
  document.querySelectorAll('.btn-operator').forEach(btn => {
    btn.classList.remove('active');
  });
  if (op) {
    document.querySelectorAll('.btn-operator').forEach(btn => {
      if (btn.dataset.value === op) btn.classList.add('active');
    });
  }
}

/** Evaluate previous op current */
function compute(prev, op, curr) {
  const a = parseFloat(prev);
  const b = parseFloat(curr);
  switch (op) {
    case '+':  return (a + b).toString();
    case '−':  return (a - b).toString();
    case '×':  return (a * b).toString();
    case '÷':  return b === 0 ? 'Error' : (a / b).toString();
    default:   return curr;
  }
}

// ── Action Handlers ─────────────────────────────────────

function handleNumber(value) {
  // After "=" start fresh
  if (state.justEvaluated) {
    state.current = value;
    state.previous = null;
    state.operator = null;
    state.justEvaluated = false;
    state.freshOperand = false;
    highlightOperator(null);
    updateDisplay();
    return;
  }

  // Replace the placeholder when waiting for second operand
  if (state.freshOperand) {
    state.current = value;
    state.freshOperand = false;
    updateDisplay();
    return;
  }

  // Normal append — cap at 9 digits
  const raw = state.current.replace('.', '').replace('-', '');
  if (raw.length >= 9) return;

  state.current = state.current === '0' ? value : state.current + value;
  updateDisplay();
}

function handleDecimal() {
  if (state.justEvaluated) {
    state.current = '0.';
    state.previous = null;
    state.operator = null;
    state.justEvaluated = false;
    state.freshOperand = false;
    highlightOperator(null);
    updateDisplay();
    return;
  }
  if (state.freshOperand) {
    state.current = '0.';
    state.freshOperand = false;
    updateDisplay();
    return;
  }
  if (!state.current.includes('.')) {
    state.current += '.';
    updateDisplay();
  }
}

function handleOperator(op) {
  highlightOperator(op);

  // If we have a pending op and a fresh operand waiting, just swap operator
  if (state.operator && state.freshOperand) {
    state.operator = op;
    updateDisplay();
    return;
  }

  // If there's a pending operation and a new number, compute it first
  if (state.operator && state.previous !== null && !state.freshOperand) {
    const result = compute(state.previous, state.operator, state.current);
    state.current = result;
    state.previous = result;
  } else {
    state.previous = state.current;
  }

  state.operator = op;
  state.freshOperand = true;
  state.justEvaluated = false;
  updateDisplay();
}

function handleEquals() {
  if (!state.operator || state.previous === null) return;

  const result = compute(state.previous, state.operator, state.current);

  // Show expression: "198.57+185.00"
  expressionEl.textContent =
    `${formatDisplay(state.previous)}${state.operator}${formatDisplay(state.current)}`;

  state.current = result;
  state.previous = null;
  state.operator = null;
  state.justEvaluated = true;
  state.freshOperand = false;
  highlightOperator(null);

  const display = formatDisplay(state.current);
  resultEl.textContent = display;
  adjustResultFont(display);
  clearBtn.textContent = 'AC';
}

function handleClear() {
  if (clearBtn.textContent === 'C' && state.current !== '0') {
    // First press: clear current entry
    state.current = '0';
    state.freshOperand = false;
    state.justEvaluated = false;
    updateDisplay();
  } else {
    // Full reset
    state.current = '0';
    state.previous = null;
    state.operator = null;
    state.justEvaluated = false;
    state.freshOperand = false;
    highlightOperator(null);
    expressionEl.textContent = '';
    resultEl.textContent = '0';
    resultEl.classList.remove('shrink-3', 'shrink-4', 'shrink-5');
    clearBtn.textContent = 'AC';
  }
}

function handleToggleSign() {
  if (state.current === '0' || state.current === 'Error') return;
  state.current = state.current.startsWith('-')
    ? state.current.slice(1)
    : '-' + state.current;
  updateDisplay();
}

function handlePercent() {
  if (state.current === 'Error') return;
  const num = parseFloat(state.current);
  // iOS behaviour: if there's a previous value, compute (prev * num/100)
  if (state.operator && state.previous !== null) {
    state.current = (parseFloat(state.previous) * num / 100).toString();
  } else {
    state.current = (num / 100).toString();
  }
  updateDisplay();
}

// ── Event delegation ─────────────────────────────────────

document.querySelector('.buttons').addEventListener('click', e => {
  const btn = e.target.closest('.btn');
  if (!btn) return;

  const action = btn.dataset.action;
  const value  = btn.dataset.value;

  switch (action) {
    case 'number':      handleNumber(value);    break;
    case 'decimal':     handleDecimal();        break;
    case 'operator':    handleOperator(value);  break;
    case 'equals':      handleEquals();         break;
    case 'clear':       handleClear();          break;
    case 'toggle-sign': handleToggleSign();     break;
    case 'percent':     handlePercent();        break;
  }
});

// ── Keyboard support ─────────────────────────────────────

document.addEventListener('keydown', e => {
  if (e.key >= '0' && e.key <= '9') { handleNumber(e.key); flashBtn(`[data-value="${e.key}"]`); }
  else if (e.key === '.') { handleDecimal(); flashBtn('[data-action="decimal"]'); }
  else if (e.key === '+') { handleOperator('+'); }
  else if (e.key === '-') { handleOperator('−'); }
  else if (e.key === '*') { handleOperator('×'); }
  else if (e.key === '/') { e.preventDefault(); handleOperator('÷'); }
  else if (e.key === 'Enter' || e.key === '=') { handleEquals(); flashBtn('[data-action="equals"]'); }
  else if (e.key === 'Backspace') { handleClear(); }
  else if (e.key === 'Escape') { handleClear(); handleClear(); }
  else if (e.key === '%') { handlePercent(); }
});

function flashBtn(selector) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.classList.add('keyboard-press');
  setTimeout(() => el.classList.remove('keyboard-press'), 120);
}

// ── Init ──────────────────────────────────────────────────
updateDisplay();
