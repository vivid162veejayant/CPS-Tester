// Elements
const startBtn = document.getElementById('startBtn');
const stopBtn  = document.getElementById('stopBtn');
const resetBtn = document.getElementById('resetBtn');
const clickBtn = document.getElementById('clickBtn');

const totalClicksEl = document.getElementById('totalClicks');
const elapsedEl     = document.getElementById('elapsed');
const avgCpsEl      = document.getElementById('avgCps');

const canvas  = document.getElementById('chart');
const ctx     = canvas.getContext('2d');

// State
let isRunning = false;
let startTime = 0;           // performance.now() at start
let stopTime  = 0;           // performance.now() at last stop
let rafId     = null;        // animation frame for live updates
let clicks    = [];          // array of click timestamps (seconds since start)

// Helpers
const nowSeconds = () => performance.now() / 1000;

function getElapsedSeconds() {
  if (!startTime) return 0;
  if (isRunning) return nowSeconds() - startTime;
  return Math.max(0, stopTime - startTime);
}

function updateMetrics() {
  const total = clicks.length;
  const elapsed = getElapsedSeconds();
  const cps = elapsed > 0 ? total / elapsed : 0;

  totalClicksEl.textContent = total.toString();
  elapsedEl.textContent     = elapsed.toFixed(1);
  avgCpsEl.textContent      = cps.toFixed(2);
}

function computeBins(intervalSec = 10) {
  const elapsed = getElapsedSeconds();
  const binCount = Math.max(1, Math.ceil(elapsed / intervalSec));
  const bins = new Array(binCount).fill(0);
  for (const t of clicks) {
    const idx = Math.min(bins.length - 1, Math.floor(t / intervalSec));
    bins[idx] += 1;
  }
  return bins;
}

function drawChart() {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Padding
  const pad = { top: 16, right: 18, bottom: 36, left: 40 };

  // Axes area
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;

  // Data
  const bins = computeBins(10);
  const maxVal = Math.max(1, ...bins);

  // Axes
  ctx.save();
  ctx.translate(pad.left, pad.top);

  // Grid lines and Y labels
  const yTicks = 4;
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '12px ui-sans-serif, system-ui, -apple-system';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= yTicks; i++) {
    const y = ch - (i / yTicks) * ch;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(cw, y);
    ctx.stroke();

    const val = Math.round((i / yTicks) * maxVal);
    ctx.fillText(val.toString(), -8, y);
  }

  // Bars
  const count = bins.length;
  const gap = Math.max(8, Math.min(24, cw / (count * 6)));
  const barWidth = Math.max(18, Math.min(60, (cw - gap * (count + 1)) / count));

  bins.forEach((v, i) => {
    const x = gap + i * (barWidth + gap);
    const hRatio = v / maxVal;
    const barH = Math.round(hRatio * (ch - 8));
    const y = ch - barH;

    // Max reference background
    ctx.fillStyle = 'rgba(34,197,94,0.10)';
    ctx.fillRect(x, 0, barWidth, ch);

    // Bar
    const gradient = ctx.createLinearGradient(0, y, 0, y + barH);
    gradient.addColorStop(0, '#38bdf8');
    gradient.addColorStop(1, '#06b6d4');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, barWidth, barH);

    // Value label
    ctx.fillStyle = '#e5f6ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = '12px ui-sans-serif, system-ui, -apple-system';
    ctx.fillText(v.toString(), x + barWidth / 2, y - 2);
  });

  // X-axis labels
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = '12px ui-sans-serif, system-ui, -apple-system';
  bins.forEach((_, i) => {
    const x = gap + i * (barWidth + gap) + barWidth / 2;
    const labelStart = i * 10;
    const labelEnd = (i + 1) * 10;
    ctx.fillText(`${labelStart}–${labelEnd}s`, x, ch + 10);
  });

  ctx.restore();
}

function tick() {
  updateMetrics();
  drawChart();
  if (isRunning) rafId = requestAnimationFrame(tick);
}

function start() {
  if (isRunning) return;
  // Fresh start (do not resume partial): clear state first if we already had a session
  if (startTime && !isRunning) {
    // Treat pressing Start again as a new run
    reset();
  }
  startTime = nowSeconds();
  stopTime = 0;
  isRunning = true;
  startBtn.disabled = true;
  stopBtn.disabled = false;
  clickBtn.disabled = false;
  rafId = requestAnimationFrame(tick);
  clickBtn.focus({ preventScroll: true });
}

function stop() {
  if (!isRunning) return;
  isRunning = false;
  stopTime = nowSeconds();
  stopBtn.disabled = true;
  clickBtn.disabled = true;
  startBtn.disabled = false; // allow a new run (which resets)
  if (rafId) cancelAnimationFrame(rafId);
  updateMetrics();
  drawChart();
}

function reset() {
  isRunning = false;
  startTime = 0;
  stopTime = 0;
  clicks = [];
  if (rafId) cancelAnimationFrame(rafId);
  totalClicksEl.textContent = '0';
  elapsedEl.textContent = '0.0';
  avgCpsEl.textContent = '0.00';
  // Clear chart
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Controls
  startBtn.disabled = false;
  stopBtn.disabled = true;
  clickBtn.disabled = true;
}

function registerClick() {
  if (!isRunning || !startTime) return;
  const t = nowSeconds() - startTime; // seconds since start
  clicks.push(t);
  // A small visual pulse on click button
  clickBtn.style.transform = 'scale(0.995)';
  setTimeout(() => { clickBtn.style.transform = 'scale(1)'; }, 40);
}

// Events
startBtn.addEventListener('click', start);
stopBtn.addEventListener('click', stop);
resetBtn.addEventListener('click', reset);
clickBtn.addEventListener('click', registerClick);

// Keyboard support (Space)
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (isRunning) registerClick();
  }
});

// Handle resize for high-DPI and crisp canvas
function resizeCanvas() {
  const ratio = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  const displayWidth = canvas.clientWidth;
  const displayHeight = canvas.clientHeight;
  canvas.width = Math.floor(displayWidth * ratio);
  canvas.height = Math.floor(displayHeight * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  drawChart();
}
const ro = new ResizeObserver(resizeCanvas);
ro.observe(canvas);

// Initialize
reset();
resizeCanvas();