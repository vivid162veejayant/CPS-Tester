/* =========================================================
   CPS TESTER - SCRIPT.JS (UPGRADED)
========================================================= */

/* =========================================================
   DOM ELEMENT REFERENCES
========================================================= */

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const resetBtn = document.getElementById("resetBtn");
const clickBtn = document.getElementById("clickBtn");
const resetBestBtn = document.getElementById("resetBestBtn");
const exportBtn = document.getElementById("exportBtn");
const modeSelect = document.getElementById("modeSelect");

const totalClicksEl = document.getElementById("totalClicks");
const elapsedEl = document.getElementById("elapsed");
const avgCpsEl = document.getElementById("avgCps");
const bestCpsEl = document.getElementById("bestCps");
const liveCpsEl = document.getElementById("liveCps");
const peakCpsEl = document.getElementById("peakCps");

const mouseCpsEl = document.getElementById("mouseCps");
const spaceCpsEl = document.getElementById("spaceCps");

const consistencyEl = document.getElementById("consistency");
const fastestBurstEl = document.getElementById("fastestBurst");
const reactionTimeEl = document.getElementById("reactionTime");
const staminaEl = document.getElementById("stamina");

const canvas = document.getElementById("chart");
const ctx = canvas ? canvas.getContext("2d") : null;

/* =========================================================
   APPLICATION STATE
========================================================= */

let isRunning = false;
let startTime = 0;
let stopTime = 0;
let animationFrameId = null;
let firstClickTime = null;

let clickTimestamps = [];
let mouseClickTimestamps = [];
let spaceClickTimestamps = [];

let cpsHistory = [];
let lastHistorySampleAt = 0;
const historySampleInterval = 1 / 30;

const storedBest = parseFloat(localStorage.getItem("bestCPS"));
let bestCPS = Number.isFinite(storedBest) ? storedBest : 0;
let peakCPS = 0;

// Anti-cheat: ignore clicks faster than 10ms apart.
const minInterval = 0.01;

// Session mode: 0 = infinite.
let sessionModeSeconds = modeSelect ? Number(modeSelect.value || 0) : 0;

// Tiny low-latency click sound.
const audioCtx = window.AudioContext ? new AudioContext() : null;

console.log("[CPS] Loaded bestCPS:", bestCPS.toFixed(2));

/* =========================================================
   TIME UTILITIES
========================================================= */

function getNowSeconds() {
  return performance.now() / 1000;
}

function getElapsedSeconds() {
  if (!startTime) return 0;
  if (isRunning) return getNowSeconds() - startTime;
  return stopTime - startTime;
}

/* =========================================================
   LOCAL STORAGE
========================================================= */

function saveBestCPS() {
  localStorage.setItem("bestCPS", bestCPS.toFixed(2));
}

function updateBestCPS(currentCPS) {
  if (currentCPS > bestCPS) {
    bestCPS = currentCPS;
    saveBestCPS();
    console.log("[CPS] New bestCPS:", bestCPS.toFixed(2));
  }
  if (bestCpsEl) bestCpsEl.textContent = bestCPS.toFixed(2);
}

function resetBestCPS() {
  bestCPS = 0;
  localStorage.removeItem("bestCPS");
  if (bestCpsEl) bestCpsEl.textContent = "0.00";
  console.log("[CPS] bestCPS reset to 0.00");
}

/* =========================================================
   METRICS
========================================================= */

function calculateCPS() {
  const elapsed = getElapsedSeconds();
  if (elapsed <= 0) return 0;
  return clickTimestamps.length / elapsed;
}

function countRecentClicks(timestamps, windowSeconds = 1) {
  const now = getElapsedSeconds();
  const from = now - windowSeconds;
  let count = 0;
  for (let i = timestamps.length - 1; i >= 0; i--) {
    if (timestamps[i] >= from) count++;
    else break;
  }
  return count;
}

function calculateConsistency() {
  if (cpsHistory.length < 5) return 100;
  const values = cpsHistory.map((p) => p.cps);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean <= 0) return 0;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  const std = Math.sqrt(variance);
  const cv = std / mean;
  return Math.max(0, 100 - cv * 100);
}

function calculateFastestBurst() {
  if (clickTimestamps.length < 2) return 0;
  let fastest = Infinity;
  for (let i = 1; i < clickTimestamps.length; i++) {
    const d = clickTimestamps[i] - clickTimestamps[i - 1];
    if (d < fastest) fastest = d;
  }
  return fastest === Infinity || fastest <= 0 ? 0 : 1 / fastest;
}

function calculateReactionTimeMs() {
  if (!startTime || firstClickTime === null) return 0;
  return Math.max(0, (firstClickTime - startTime) * 1000);
}

function calculateStamina() {
  if (cpsHistory.length < 10) return 100;
  const split = Math.floor(cpsHistory.length * 0.3);
  const early = cpsHistory.slice(0, split);
  const late = cpsHistory.slice(-split);
  const avg = (arr) => arr.reduce((a, b) => a + b.cps, 0) / Math.max(1, arr.length);
  const earlyAvg = avg(early);
  const lateAvg = avg(late);
  if (earlyAvg <= 0) return 100;
  return Math.max(0, (lateAvg / earlyAvg) * 100);
}

function setAnimatedValue(el, value, decimals = 2) {
  if (!el) return;
  el.textContent = Number(value).toFixed(decimals);
}

function updateMetrics() {
  const totalClicks = clickTimestamps.length;
  const elapsed = getElapsedSeconds();
  const avgCPS = calculateCPS();
  const liveCPS = countRecentClicks(clickTimestamps, 1);
  const mouseLive = countRecentClicks(mouseClickTimestamps, 1);
  const spaceLive = countRecentClicks(spaceClickTimestamps, 1);

  if (liveCPS > peakCPS) peakCPS = liveCPS;
  updateBestCPS(Math.max(peakCPS, avgCPS));

  if (totalClicksEl) totalClicksEl.textContent = String(totalClicks);
  if (elapsedEl) elapsedEl.textContent = elapsed.toFixed(1);
  if (avgCpsEl) setAnimatedValue(avgCpsEl, avgCPS);
  if (liveCpsEl) setAnimatedValue(liveCpsEl, liveCPS);
  if (peakCpsEl) setAnimatedValue(peakCpsEl, peakCPS);
  if (mouseCpsEl) setAnimatedValue(mouseCpsEl, mouseLive);
  if (spaceCpsEl) setAnimatedValue(spaceCpsEl, spaceLive);

  if (consistencyEl) setAnimatedValue(consistencyEl, calculateConsistency(), 1);
  if (fastestBurstEl) setAnimatedValue(fastestBurstEl, calculateFastestBurst());
  if (reactionTimeEl) reactionTimeEl.textContent = Math.round(calculateReactionTimeMs()) + "ms";
  if (staminaEl) setAnimatedValue(staminaEl, calculateStamina(), 1);

  // Premium feel: subtle glow/shake based on live CPS.
  if (clickBtn) {
    clickBtn.style.boxShadow = liveCPS >= 10 ? "0 0 20px rgba(56,189,248,0.8)" : "";
    clickBtn.style.transform = liveCPS >= 12 ? "translateX(-1px)" : clickBtn.style.transform;
  }
}

/* =========================================================
   HISTORY + GRAPH
========================================================= */

function sampleCPSHistory() {
  const elapsed = getElapsedSeconds();
  if (elapsed - lastHistorySampleAt < historySampleInterval) return;
  lastHistorySampleAt = elapsed;
  cpsHistory.push({ t: elapsed, cps: countRecentClicks(clickTimestamps, 1) });
}

function drawLineGraph() {
  if (!canvas || !ctx) return;

  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  ctx.clearRect(0, 0, width, height);

  const padding = { top: 18, right: 16, bottom: 28, left: 42 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxY = Math.max(1, ...cpsHistory.map((p) => p.cps), peakCPS);
  const elapsed = Math.max(1, getElapsedSeconds());

  ctx.save();
  ctx.translate(padding.left, padding.top);

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "12px sans-serif";

  for (let i = 0; i <= 4; i++) {
    const y = chartHeight - (i / 4) * chartHeight;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(chartWidth, y);
    ctx.stroke();
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(String(Math.round((i / 4) * maxY)), -8, y);
  }

  if (cpsHistory.length > 1) {
    ctx.beginPath();
    for (let i = 0; i < cpsHistory.length; i++) {
      const p = cpsHistory[i];
      const x = (p.t / elapsed) * chartWidth;
      const y = chartHeight - (p.cps / maxY) * chartHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("Live CPS over time", 0, chartHeight + 8);

  ctx.restore();
}

/* =========================================================
   AUDIO + MOBILE HELPERS
========================================================= */

function playClickSound() {
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "square";
  osc.frequency.value = 900;
  gain.gain.value = 0.03;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const t = audioCtx.currentTime;
  osc.start(t);
  osc.stop(t + 0.02);
}

function vibrateTap() {
  if (navigator.vibrate) navigator.vibrate(10);
}

function tryFullscreen() {
  if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(() => {});
  }
}

/* =========================================================
   EXPORT
========================================================= */

function exportScores() {
  const data = {
    mode: sessionModeSeconds === 0 ? "infinite" : `${sessionModeSeconds}s`,
    clicks: clickTimestamps.length,
    mouseClicks: mouseClickTimestamps.length,
    spaceClicks: spaceClickTimestamps.length,
    liveCPS: countRecentClicks(clickTimestamps, 1),
    peakCPS,
    averageCPS: calculateCPS(),
    bestCPS,
    consistency: calculateConsistency(),
    fastestBurstCPS: calculateFastestBurst(),
    reactionTimeMs: calculateReactionTimeMs(),
    staminaPercent: calculateStamina(),
    elapsedSeconds: getElapsedSeconds(),
    exportedAt: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cps-session.json";
  a.click();
  URL.revokeObjectURL(url);
}

/* =========================================================
   MAIN LOOP
========================================================= */

function tick() {
  sampleCPSHistory();
  updateMetrics();
  drawLineGraph();

  const elapsed = getElapsedSeconds();
  if (sessionModeSeconds > 0 && elapsed >= sessionModeSeconds) {
    stopSession();
    return;
  }

  if (isRunning) animationFrameId = requestAnimationFrame(tick);
}

/* =========================================================
   SESSION CONTROLS
========================================================= */

function startSession() {
  if (isRunning) return;

  resetSession();
  peakCPS = 0;
  startTime = getNowSeconds();
  isRunning = true;
  firstClickTime = null;

  startBtn.disabled = true;
  stopBtn.disabled = false;
  clickBtn.disabled = false;
  clickBtn.focus();

  tryFullscreen();
  animationFrameId = requestAnimationFrame(tick);
}

function stopSession() {
  if (!isRunning) return;

  isRunning = false;
  stopTime = getNowSeconds();
  cancelAnimationFrame(animationFrameId);

  startBtn.disabled = false;
  stopBtn.disabled = true;
  clickBtn.disabled = true;

  updateMetrics();
  drawLineGraph();
}

function resetSession() {
  isRunning = false;
  startTime = 0;
  stopTime = 0;
  peakCPS = 0;
  firstClickTime = null;

  clickTimestamps = [];
  mouseClickTimestamps = [];
  spaceClickTimestamps = [];
  cpsHistory = [];
  lastHistorySampleAt = 0;

  cancelAnimationFrame(animationFrameId);

  if (totalClicksEl) totalClicksEl.textContent = "0";
  if (elapsedEl) elapsedEl.textContent = "0.0";
  if (avgCpsEl) avgCpsEl.textContent = "0.00";
  if (liveCpsEl) liveCpsEl.textContent = "0.00";
  if (peakCpsEl) peakCpsEl.textContent = "0.00";
  if (mouseCpsEl) mouseCpsEl.textContent = "0.00";
  if (spaceCpsEl) spaceCpsEl.textContent = "0.00";
  if (bestCpsEl) bestCpsEl.textContent = bestCPS.toFixed(2);
  if (consistencyEl) consistencyEl.textContent = "100.0";
  if (fastestBurstEl) fastestBurstEl.textContent = "0.00";
  if (reactionTimeEl) reactionTimeEl.textContent = "0ms";
  if (staminaEl) staminaEl.textContent = "100.0";

  if (ctx && canvas) ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

  startBtn.disabled = false;
  stopBtn.disabled = true;
  clickBtn.disabled = true;
}

/* =========================================================
   CLICK HANDLING
========================================================= */

function registerClick(source = "mouse") {
  if (!isRunning) return;

  const timestamp = getNowSeconds() - startTime;
  const lastTs = clickTimestamps.length > 0 ? clickTimestamps[clickTimestamps.length - 1] : null;

  // Anti-cheat.
  if (lastTs !== null && timestamp - lastTs < minInterval) return;

  if (firstClickTime === null) firstClickTime = timestamp + startTime;

  clickTimestamps.push(timestamp);
  if (source === "space") spaceClickTimestamps.push(timestamp);
  else mouseClickTimestamps.push(timestamp);

  clickBtn.style.transform = "scale(0.97)";
  setTimeout(() => {
    clickBtn.style.transform = "scale(1)";
  }, 40);

  playClickSound();
  vibrateTap();
}

/* =========================================================
   EVENT LISTENERS
========================================================= */

startBtn.addEventListener("click", startSession);
stopBtn.addEventListener("click", stopSession);
resetBtn.addEventListener("click", resetSession);
clickBtn.addEventListener("click", () => registerClick("mouse"));
clickBtn.addEventListener("touchstart", (event) => {
  event.preventDefault();
  registerClick("mouse");
});

if (resetBestBtn) resetBestBtn.addEventListener("click", resetBestCPS);
if (exportBtn) exportBtn.addEventListener("click", exportScores);

if (modeSelect) {
  modeSelect.addEventListener("change", () => {
    sessionModeSeconds = Number(modeSelect.value || 0);
  });
}

window.addEventListener("keydown", (event) => {
  if (event.code !== "Space") return;
  if (event.repeat) return;

  const active = document.activeElement;
  const activeTag = active ? active.tagName : "";
  if (activeTag === "INPUT" || activeTag === "TEXTAREA") return;

  event.preventDefault();
  if (isRunning) registerClick("space");
});

/* =========================================================
   RESPONSIVE CANVAS
========================================================= */

function resizeCanvas() {
  if (!canvas || !ctx) return;
  const ratio = window.devicePixelRatio || 1;
  const displayWidth = canvas.clientWidth;
  const displayHeight = canvas.clientHeight;
  canvas.width = displayWidth * ratio;
  canvas.height = displayHeight * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  drawLineGraph();
}

if (canvas) {
  const resizeObserver = new ResizeObserver(resizeCanvas);
  resizeObserver.observe(canvas);
}

/* =========================================================
   INITIALIZATION
========================================================= */

resetSession();
resizeCanvas();
