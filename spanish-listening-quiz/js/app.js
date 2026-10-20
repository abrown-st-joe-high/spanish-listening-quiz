/* ==========================================================================
   Oído — Spanish listening quiz engine
   Data-driven: add a new practice set by adding a JSON file under /data
   and one line in data/modules.json. No other code changes needed.
   ========================================================================== */

const AUDIO_EXTENSIONS = ["mp3", "m4a", "webm", "ogg", "wav"]; // first one found per file wins
const localUrls = new Map(); // recordings made on the recorder page, keyed "audio/<set>/<id>"

const state = {
  modules: [],
  selectedModule: null,
  moduleData: null,
  roundSize: 10,
  queue: [],
  currentIndex: 0,
  score: 0,
  misses: [],
  usedFallbackAudio: false,
  answered: false,
};

const el = (id) => document.getElementById(id);
const screens = {
  home: el("screen-home"),
  options: el("screen-options"),
  listen: el("screen-listen"),
  quiz: el("screen-quiz"),
  results: el("screen-results"),
};

/* ---------------------------- enabled/disabled sound persistence ---------------------------- */

function disabledKey(moduleId) { return `oido:disabled:${moduleId}`; }

function getDisabledIds(moduleId) {
  try { return new Set(JSON.parse(localStorage.getItem(disabledKey(moduleId)) || "[]")); }
  catch (e) { return new Set(); }
}

function setDisabledIds(moduleId, idSet) {
  try { localStorage.setItem(disabledKey(moduleId), JSON.stringify([...idSet])); }
  catch (e) { /* storage unavailable — filter just won't persist */ }
}

// Falls back to the full set rather than ever handing the quiz an empty pool.
function getEnabledItems(moduleData) {
  const disabled = getDisabledIds(moduleData.id);
  const enabled = moduleData.items.filter((i) => !disabled.has(i.id));
  return enabled.length ? enabled : moduleData.items;
}

/* ---------------------------- English gloss toggle ---------------------------- */

const GLOSS_KEY = "oido:showGloss";

function showGlossEnabled() {
  return localStorage.getItem(GLOSS_KEY) === "1";
}

function setShowGloss(on) {
  try { localStorage.setItem(GLOSS_KEY, on ? "1" : "0"); }
  catch (e) { /* storage unavailable — toggle just won't persist */ }
}

// Builds the label markup for an option button or listen tile: the target
// word/symbol, plus its English gloss underneath when the toggle is on and
// the item has one (currently days.json and months.json).
function itemDisplayHTML(item, showLabel = true) {
  const gloss = showGlossEnabled() && item.gloss ? `<span class="opt-gloss">${item.gloss}</span>` : "";
  if (item.art) {
    // picture items: the label is hidden during the quiz so the answer is heard, not read
    const img = `<img class="pix" alt="" src="${pixelArtURL(item.art)}">`;
    return img + (showLabel ? `<span class="opt-main small">${item.label}</span>` : "") + gloss;
  }
  return `<span class="opt-main">${item.label}</span>${gloss}`;
}

function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove("active"));
  screens[name].classList.add("active");
}

/* ---------------------------- bootstrap ---------------------------- */

async function init() {
  try {
    for (const r of await RecStore.all()) localUrls.set(r.key, URL.createObjectURL(r.blob));
  } catch (err) { /* no local recordings available */ }
  try {
    const res = await fetch("data/modules.json");
    state.modules = await res.json();
  } catch (err) {
    el("module-list").innerHTML =
      '<p style="color:var(--muted)">Could not load data/modules.json.</p>';
    return;
  }
  renderModuleList();
  wireHomeControls();
}

function renderModuleList() {
  const container = el("module-list");
  container.innerHTML = "";
  state.modules.forEach((mod) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "module-row";
    row.dataset.moduleId = mod.id;
    row.innerHTML = `<span class="m-name">${mod.label}</span><span class="m-count"></span>`;
    row.addEventListener("click", () => selectModule(mod, row));
    container.appendChild(row);

    // fill in item count once the file is fetched, without blocking the list
    fetch(mod.dataFile)
      .then((r) => r.json())
      .then((data) => {
        row.querySelector(".m-count").textContent = `${data.items.length} sounds`;
      })
      .catch(() => {
        row.querySelector(".m-count").textContent = "unavailable";
        row.disabled = true;
        row.style.opacity = 0.4;
      });
  });
}

function selectModule(mod, rowEl) {
  document.querySelectorAll(".module-row").forEach((r) => r.classList.remove("selected"));
  rowEl.classList.add("selected");
  state.selectedModule = mod;
  el("start-btn").disabled = false;
  el("study-btn").disabled = false;
  el("customize-btn").disabled = false;
}

function wireHomeControls() {
  document.querySelectorAll("#count-choices button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#count-choices button").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      state.roundSize = parseInt(btn.dataset.count, 10);
    });
  });
  el("count-choices").querySelector('[data-count="10"]').classList.add("selected");

  el("start-btn").addEventListener("click", startRound);
  el("again-btn").addEventListener("click", startRound);
  el("home-btn").addEventListener("click", () => showScreen("home"));
  el("play-btn").addEventListener("click", () => playCurrentAudio());
  el("next-btn").addEventListener("click", nextQuestion);

  el("study-btn").addEventListener("click", openListenScreen);
  el("listen-back-btn").addEventListener("click", () => showScreen("home"));
  el("listen-start-btn").addEventListener("click", startRound);

  const glossToggle = el("gloss-toggle");
  glossToggle.checked = showGlossEnabled();
  glossToggle.addEventListener("change", () => setShowGloss(glossToggle.checked));

  el("customize-btn").addEventListener("click", openOptionsScreen);
  el("options-back-btn").addEventListener("click", () => showScreen("home"));
  el("options-all-btn").addEventListener("click", () => {
    setDisabledIds(state.moduleData.id, new Set());
    renderOptionsList();
  });
  el("options-none-btn").addEventListener("click", () => {
    setDisabledIds(state.moduleData.id, new Set(state.moduleData.items.map((i) => i.id)));
    renderOptionsList();
  });
}

/* ---------------------------- options (customize sounds) screen ---------------------------- */

async function openOptionsScreen() {
  await ensureModuleDataLoaded();
  el("options-title").textContent = state.moduleData.title;
  renderOptionsList();
  showScreen("options");
}

function renderOptionsList() {
  const disabled = getDisabledIds(state.moduleData.id);
  const list = el("options-list");
  list.innerHTML = "";
  state.moduleData.items.forEach((item) => {
    const row = document.createElement("label");
    row.className = "option-row" + (disabled.has(item.id) ? " unchecked" : "");

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !disabled.has(item.id);
    cb.addEventListener("change", () => {
      const d = getDisabledIds(state.moduleData.id);
      if (cb.checked) d.delete(item.id); else d.add(item.id);
      setDisabledIds(state.moduleData.id, d);
      row.classList.toggle("unchecked", !cb.checked);
      updateOptionsWarning();
    });

    const label = document.createElement("span");
    label.className = "opt-label";
    label.textContent = item.label;

    const spoken = document.createElement("span");
    spoken.className = "opt-spoken";
    spoken.textContent = item.spoken;

    row.appendChild(cb);
    row.appendChild(label);
    row.appendChild(spoken);
    list.appendChild(row);
  });
  updateOptionsWarning();
}

function updateOptionsWarning() {
  const disabled = getDisabledIds(state.moduleData.id);
  el("options-warning").textContent =
    disabled.size >= state.moduleData.items.length
      ? "At least one sound is needed — using the full set until one is checked."
      : "";
}

/* ---------------------------- listen (study) screen ---------------------------- */

// Loads the selected module's data if it isn't already cached, so both
// the study screen and the quiz can share one fetch when used back to back.
async function ensureModuleDataLoaded() {
  if (!state.moduleData || state.moduleData.id !== state.selectedModule.id) {
    const res = await fetch(state.selectedModule.dataFile);
    state.moduleData = await res.json();
  }
}

async function openListenScreen() {
  await ensureModuleDataLoaded();
  el("listen-title").textContent = state.moduleData.title;
  renderListenGrid();
  showScreen("listen");
}

function renderListenGrid() {
  const grid = el("listen-grid");
  grid.innerHTML = "";
  const listItems = getEnabledItems(state.moduleData);
  grid.classList.toggle("art-grid", listItems.some((i) => i.art));
  listItems.forEach((item) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "listen-tile";
    tile.innerHTML = itemDisplayHTML(item);
    tile.addEventListener("click", () => {
      tile.classList.add("playing");
      setTimeout(() => tile.classList.remove("playing"), 400);
      playItemAudio(item);
    });
    grid.appendChild(tile);
  });
}

/* ---------------------------- round setup ---------------------------- */

async function startRound() {
  await ensureModuleDataLoaded();

  const items = getEnabledItems(state.moduleData);
  const size = state.roundSize === 0 ? items.length : Math.min(state.roundSize, items.length * 3);

  state.queue = buildQueue(items, size);
  state.currentIndex = 0;
  state.score = 0;
  state.misses = [];
  state.usedFallbackAudio = false;
  el("audio-mode-note").textContent = "";

  showScreen("quiz");
  renderQuestion();
}

// Build a shuffled queue; repeats the item pool (reshuffled) if a longer
// round is requested than there are distinct items.
function buildQueue(items, size) {
  const queue = [];
  while (queue.length < size) {
    queue.push(...shuffle([...items]));
  }
  return queue.slice(0, size);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ---------------------------- question rendering ---------------------------- */

function currentItem() {
  return state.queue[state.currentIndex];
}

function renderQuestion() {
  state.answered = false;
  const correct = currentItem();

  el("quiz-progress-label").textContent = `Question ${state.currentIndex + 1} of ${state.queue.length}`;
  el("quiz-score-label").textContent = `Score ${state.score}`;
  el("progress-fill").style.width = `${(state.currentIndex / state.queue.length) * 100}%`;
  el("feedback-row").textContent = "";
  el("feedback-row").className = "feedback-row";
  el("next-btn").classList.remove("visible");

  const items = getEnabledItems(state.moduleData);
  const options = buildOptions(items, correct);
  const grid = el("options-grid");
  grid.innerHTML = "";
  options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option-btn";
    btn.innerHTML = itemDisplayHTML(opt, false);
    btn.dataset.itemId = opt.id;
    btn.addEventListener("click", () => handleAnswer(opt, correct, btn, grid));
    grid.appendChild(btn);
  });

  playCurrentAudio();
}

// Picks 3 distractors, preferring the correct item's confuseGroup so the
// hard letters (g/j/h/y, s/c/z, m/n/ñ ...) get drilled together, then
// backfills randomly if the confuse group is smaller than needed.
function buildOptions(items, correct) {
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  const pool = new Map();

  shuffle([...(correct.confuseGroup || [])]).forEach((id) => {
    if (byId[id]) pool.set(id, byId[id]);
  });

  const remaining = shuffle(items.filter((i) => i.id !== correct.id && !pool.has(i.id)));
  for (const item of remaining) {
    if (pool.size >= 3) break;
    pool.set(item.id, item);
  }

  const options = [...pool.values()].slice(0, 3);
  options.push(correct);
  return shuffle(options);
}

/* ---------------------------- answering ---------------------------- */

function handleAnswer(chosen, correct, btnEl, grid) {
  if (state.answered) return;
  state.answered = true;

  const isCorrect = chosen.id === correct.id;
  if (isCorrect) {
    state.score += 1;
  } else {
    state.misses.push({ heard: correct.label, picked: chosen.label });
  }

  grid.querySelectorAll(".option-btn").forEach((b) => {
    b.classList.add("disabled");
    if (b.dataset.itemId === correct.id) b.classList.add("correct");
    if (b.dataset.itemId === chosen.id && !isCorrect) b.classList.add("incorrect");
  });

  const feedback = el("feedback-row");
  feedback.textContent = isCorrect ? "Correct." : `Not quite — that was "${correct.label}".`;
  feedback.className = "feedback-row " + (isCorrect ? "correct" : "incorrect");

  el("quiz-score-label").textContent = `Score ${state.score}`;
  el("next-btn").classList.add("visible");
}

function nextQuestion() {
  state.currentIndex += 1;
  if (state.currentIndex >= state.queue.length) {
    showResults();
  } else {
    renderQuestion();
  }
}

/* ---------------------------- results ---------------------------- */

function showResults() {
  showScreen("results");
  el("results-score").textContent = `${state.score}/${state.queue.length}`;
  const pct = Math.round((state.score / state.queue.length) * 100);
  el("results-sub").textContent = `${pct}% correct`;

  const missBox = el("miss-list");
  const missRows = el("miss-rows");
  missRows.innerHTML = "";
  if (state.misses.length > 0) {
    missBox.style.display = "block";
    state.misses.forEach((m) => {
      const row = document.createElement("div");
      row.className = "miss-row";
      row.innerHTML = `<span class="heard">${m.heard}</span><span class="picked">picked ${m.picked}</span>`;
      missRows.appendChild(row);
    });
  } else {
    missBox.style.display = "none";
  }

  if (state.usedFallbackAudio) {
    el("audio-mode-note").textContent =
      "Sound files weren't found for this set, so the browser's Spanish voice stood in. Add files to the matching /audio folder for recorded playback.";
  }
}

/* ---------------------------- audio playback ---------------------------- */

// Tries each configured extension in turn, then falls back to the
// browser's built-in speech synthesis so the quiz is usable before any
// audio files exist.
function playCurrentAudio() {
  playItemAudio(currentItem());
}

function playItemAudio(item) {
  const basePath = state.moduleData.audioPath;
  const local = localUrls.get(basePath + item.id);
  if (local) { new Audio(local).play().catch(() => {}); return; }
  tryPlayFile(basePath, item, 0);
}

function tryPlayFile(basePath, item, extIndex) {
  if (extIndex >= AUDIO_EXTENSIONS.length) {
    speakFallback(item);
    return;
  }
  const url = `${basePath}${item.id}.${AUDIO_EXTENSIONS[extIndex]}`;
  const audio = new Audio(url);
  let settled = false;

  audio.addEventListener("canplaythrough", () => {
    if (settled) return;
    settled = true;
    audio.play().catch(() => speakFallback(item));
  });
  audio.addEventListener("error", () => {
    if (settled) return;
    settled = true;
    tryPlayFile(basePath, item, extIndex + 1);
  });
}

function speakFallback(item) {
  state.usedFallbackAudio = true;
  if (!("speechSynthesis" in window)) return;
  const utter = new SpeechSynthesisUtterance(item.spoken);
  utter.lang = state.moduleData.fallbackLang || "es-ES";
  utter.rate = 0.9;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

init();
