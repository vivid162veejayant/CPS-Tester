/* =========================================================
   CPS TESTER - SCRIPT.JS
   ---------------------------------------------------------
   Features:
   ✅ Accurate click timestamp tracking
   ✅ Spacebar support
   ✅ Best CPS persistence using localStorage
   ✅ Reset Best CPS button
   ✅ Peak CPS tracking
   ✅ Live statistics updates
   ✅ Responsive canvas chart
   ✅ Organized and documented structure
========================================================= */


/* =========================================================
   DOM ELEMENT REFERENCES
========================================================= */

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const resetBtn = document.getElementById("resetBtn");
const clickBtn = document.getElementById("clickBtn");
const resetBestBtn = document.getElementById("resetBestBtn");

const totalClicksEl = document.getElementById("totalClicks");
const elapsedEl = document.getElementById("elapsed");
const avgCpsEl = document.getElementById("avgCps");
const bestCpsEl = document.getElementById("bestCps");

const canvas = document.getElementById("chart");
const ctx = canvas.getContext("2d");


/* =========================================================
   APPLICATION STATE
========================================================= */

let isRunning = false;

let startTime = 0;
let stopTime = 0;

let animationFrameId = null;

/*
   Stores click timestamps in seconds.

   Example:
   [0.2, 0.5, 1.1, 1.4]
*/
let clickTimestamps = [];

/*
   Best CPS score saved permanently.
*/
let bestCPS = Number(localStorage.getItem("bestCPS")) || 0;

/*
   Peak CPS reached in current session.
*/
let peakCPS = 0;


/* =========================================================
   TIME UTILITIES
========================================================= */

/**
 * Returns current high precision time in seconds.
 */
function getNowSeconds() {
    return performance.now() / 1000;
}

/**
 * Returns elapsed session time.
 */
function getElapsedSeconds() {

    if (!startTime) return 0;

    if (isRunning) {
        return getNowSeconds() - startTime;
    }

    return stopTime - startTime;
}


/* =========================================================
   LOCAL STORAGE
========================================================= */

/**
 * Saves best CPS into browser storage.
 */
function saveBestCPS() {
    localStorage.setItem(
        "bestCPS",
        bestCPS.toFixed(2)
    );
}

/**
 * Updates Best CPS if current score is higher.
 */
function updateBestCPS(currentCPS) {

    if (currentCPS > bestCPS) {

        bestCPS = currentCPS;

        saveBestCPS();
    }

    bestCpsEl.textContent =
        bestCPS.toFixed(2);
}

/**
 * Completely clears stored Best CPS.
 */
function resetBestCPS() {

    bestCPS = 0;

    localStorage.removeItem("bestCPS");

    bestCpsEl.textContent = "0.00";
}


/* =========================================================
   METRICS
========================================================= */

/**
 * Calculates current CPS.
 */
function calculateCPS() {

    const elapsed =
        getElapsedSeconds();

    if (elapsed <= 0) return 0;

    return (
        clickTimestamps.length / elapsed
    );
}

/**
 * Calculates recent CPS
 * using last 1 second window.
 */
function calculateRecentCPS() {

    const now =
        getElapsedSeconds();

    const oneSecondAgo =
        now - 1;

    const recentClicks =
        clickTimestamps.filter(
            time => time >= oneSecondAgo
        );

    return recentClicks.length;
}

/**
 * Updates all visible statistics.
 */
function updateMetrics() {

    const totalClicks =
        clickTimestamps.length;

    const elapsed =
        getElapsedSeconds();

    const cps =
        calculateCPS();

    const recentCPS =
        calculateRecentCPS();

    totalClicksEl.textContent =
        totalClicks;

    elapsedEl.textContent =
        elapsed.toFixed(1);

    avgCpsEl.textContent =
        cps.toFixed(2);

    /*
       Track highest CPS spike.
    */
    if (recentCPS > peakCPS) {
        peakCPS = recentCPS;
    }

    updateBestCPS(peakCPS);
}


/* =========================================================
   CHART DATA PROCESSING
========================================================= */

/**
 * Groups clicks into time bins.
 *
 * Example:
 * Every 10 seconds becomes one bar.
 */
function computeBins(
    intervalSeconds = 10
) {

    const elapsed =
        getElapsedSeconds();

    const totalBins = Math.max(
        1,
        Math.ceil(
            elapsed / intervalSeconds
        )
    );

    const bins =
        new Array(totalBins).fill(0);

    for (const timestamp of clickTimestamps) {

        const index = Math.min(
            bins.length - 1,
            Math.floor(
                timestamp /
                intervalSeconds
            )
        );

        bins[index]++;
    }

    return bins;
}


/* =========================================================
   CHART RENDERING
========================================================= */

/**
 * Draws the CPS chart.
 */
function drawChart() {

    const width =
        canvas.clientWidth;

    const height =
        canvas.clientHeight;

    ctx.clearRect(
        0,
        0,
        width,
        height
    );

    const padding = {
        top: 20,
        right: 20,
        bottom: 40,
        left: 45
    };

    const chartWidth =
        width -
        padding.left -
        padding.right;

    const chartHeight =
        height -
        padding.top -
        padding.bottom;

    const bins =
        computeBins(10);

    const maxValue =
        Math.max(1, ...bins);

    ctx.save();

    ctx.translate(
        padding.left,
        padding.top
    );


    /* -------------------------
       GRID LINES
    ------------------------- */

    const yTicks = 4;

    ctx.strokeStyle =
        "rgba(255,255,255,0.08)";

    ctx.fillStyle =
        "rgba(255,255,255,0.7)";

    ctx.font =
        "12px sans-serif";

    for (
        let i = 0;
        i <= yTicks;
        i++
    ) {

        const y =
            chartHeight -
            (i / yTicks) *
            chartHeight;

        ctx.beginPath();

        ctx.moveTo(0, y);

        ctx.lineTo(
            chartWidth,
            y
        );

        ctx.stroke();

        const value =
            Math.round(
                (i / yTicks) *
                maxValue
            );

        ctx.textAlign = "right";

        ctx.textBaseline =
            "middle";

        ctx.fillText(
            value,
            -8,
            y
        );
    }


    /* -------------------------
       BARS
    ------------------------- */

    const gap = 12;

    const barWidth =
        (
            chartWidth -
            gap *
            (bins.length + 1)
        ) / bins.length;

    bins.forEach(
        (value, index) => {

            const x =
                gap +
                index *
                (barWidth + gap);

            const barHeight =
                (
                    value /
                    maxValue
                ) *
                (chartHeight - 10);

            const y =
                chartHeight -
                barHeight;

            // Bar background
            ctx.fillStyle =
                "rgba(255,255,255,0.06)";

            ctx.fillRect(
                x,
                0,
                barWidth,
                chartHeight
            );

            // Gradient bar
            const gradient =
                ctx.createLinearGradient(
                    0,
                    y,
                    0,
                    y + barHeight
                );

            gradient.addColorStop(
                0,
                "#38bdf8"
            );

            gradient.addColorStop(
                1,
                "#06b6d4"
            );

            ctx.fillStyle =
                gradient;

            ctx.fillRect(
                x,
                y,
                barWidth,
                barHeight
            );

            // Value text
            ctx.fillStyle =
                "#ffffff";

            ctx.textAlign =
                "center";

            ctx.textBaseline =
                "bottom";

            ctx.fillText(
                value,
                x + barWidth / 2,
                y - 4
            );
        }
    );


    /* -------------------------
       X AXIS LABELS
    ------------------------- */

    ctx.fillStyle =
        "rgba(255,255,255,0.7)";

    ctx.textBaseline =
        "top";

    bins.forEach(
        (_, index) => {

            const x =
                gap +
                index *
                (barWidth + gap) +
                barWidth / 2;

            const start =
                index * 10;

            const end =
                (index + 1) * 10;

            ctx.fillText(
                `${start}-${end}s`,
                x,
                chartHeight + 10
            );
        }
    );

    ctx.restore();
}


/* =========================================================
   MAIN LOOP
========================================================= */

/**
 * Animation loop.
 */
function tick() {

    updateMetrics();

    drawChart();

    if (isRunning) {

        animationFrameId =
            requestAnimationFrame(
                tick
            );
    }
}


/* =========================================================
   SESSION CONTROLS
========================================================= */

/**
 * Starts a new CPS session.
 */
function startSession() {

    if (isRunning) return;

    resetSession();

    peakCPS = 0;

    startTime =
        getNowSeconds();

    isRunning = true;

    startBtn.disabled = true;

    stopBtn.disabled = false;

    clickBtn.disabled = false;

    clickBtn.focus();

    animationFrameId =
        requestAnimationFrame(
            tick
        );
}

/**
 * Stops the active session.
 */
function stopSession() {

    if (!isRunning) return;

    isRunning = false;

    stopTime =
        getNowSeconds();

    cancelAnimationFrame(
        animationFrameId
    );

    startBtn.disabled = false;

    stopBtn.disabled = true;

    clickBtn.disabled = true;

    updateMetrics();

    drawChart();
}

/**
 * Completely resets the session.
 */
function resetSession() {

    isRunning = false;

    startTime = 0;

    stopTime = 0;

    peakCPS = 0;

    clickTimestamps = [];

    cancelAnimationFrame(
        animationFrameId
    );

    totalClicksEl.textContent =
        "0";

    elapsedEl.textContent =
        "0.0";

    avgCpsEl.textContent =
        "0.00";

    bestCpsEl.textContent =
        bestCPS.toFixed(2);

    ctx.clearRect(
        0,
        0,
        canvas.clientWidth,
        canvas.clientHeight
    );

    startBtn.disabled = false;

    stopBtn.disabled = true;

    clickBtn.disabled = true;
}


/* =========================================================
   CLICK HANDLING
========================================================= */

/**
 * Registers one click.
 */
function registerClick() {

    if (!isRunning) return;

    const timestamp =
        getNowSeconds() -
        startTime;

    clickTimestamps.push(
        timestamp
    );

    // Small click animation
    clickBtn.style.transform =
        "scale(0.97)";

    setTimeout(() => {

        clickBtn.style.transform =
            "scale(1)";

    }, 40);
}


/* =========================================================
   EVENT LISTENERS
========================================================= */

startBtn.addEventListener(
    "click",
    startSession
);

stopBtn.addEventListener(
    "click",
    stopSession
);

resetBtn.addEventListener(
    "click",
    resetSession
);

clickBtn.addEventListener(
    "click",
    registerClick
);

/*
   Reset Best CPS button
*/
if (resetBestBtn) {

    resetBestBtn.addEventListener(
        "click",
        resetBestCPS
    );
}


/*
   Spacebar support.

   Prevents repeated auto-fire
   when key is held.
*/
window.addEventListener(
    "keydown",
    (event) => {

        if (
            event.code !== "Space"
        ) return;

        // Ignore repeated holding
        if (event.repeat) return;

        // Ignore typing inside inputs
        const activeTag =
            document.activeElement
            .tagName;

        const isTyping =
            activeTag === "INPUT" ||
            activeTag === "TEXTAREA";

        if (isTyping) return;

        event.preventDefault();

        if (isRunning) {
            registerClick();
        }
    }
);


/* =========================================================
   RESPONSIVE CANVAS
========================================================= */

/**
 * Makes canvas sharp on all displays.
 */
function resizeCanvas() {

    const ratio =
        window.devicePixelRatio || 1;

    const displayWidth =
        canvas.clientWidth;

    const displayHeight =
        canvas.clientHeight;

    canvas.width =
        displayWidth * ratio;

    canvas.height =
        displayHeight * ratio;

    ctx.setTransform(
        ratio,
        0,
        0,
        ratio,
        0,
        0
    );

    drawChart();
}

const resizeObserver =
    new ResizeObserver(
        resizeCanvas
    );

resizeObserver.observe(
    canvas
);


/* =========================================================
   INITIALIZATION
========================================================= */

resetSession();

resizeCanvas();
