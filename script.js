/* =============================================
   Mood Weaver — Script
   3D-сфера (Fresnel Shader), частицы, кольцо,
   звёздный фон, Web Audio синтезатор, хоткеи
   ============================================= */

// ======================== Проверка Three.js ========================

if (typeof THREE === 'undefined') {
  document.body.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:center;height:100vh;padding:2rem;font-family:sans-serif;color:#888;text-align:center;background:#0a0a14">Failed to load 3D engine. Check your internet connection or open this page via a local server (python3 -m http.server).</div>';
  throw new Error('Three.js not loaded');
}

// ======================== DOM ========================

const container = document.getElementById('canvas-container');
const fpsEl = document.getElementById('fps');
const bassInput = document.getElementById('bass');
const trebleInput = document.getElementById('treble');
const bassValueEl = document.getElementById('bass-value');
const trebleValueEl = document.getElementById('treble-value');
const presetBtns = document.querySelectorAll('.preset-btn');
const randomBtn = document.getElementById('random-btn');
const helpBtn = document.getElementById('help-btn');
const helpOverlay = document.getElementById('help-overlay');
const helpClose = document.getElementById('help-close');
const bassTooltip = document.getElementById('bass-tooltip');
const trebleTooltip = document.getElementById('treble-tooltip');
const savedName = document.getElementById('saved-name');
const savedSaveBtn = document.getElementById('saved-save-btn');
const savedList = document.getElementById('saved-list');
const uiToggle = document.getElementById('ui-toggle');
const uiHint = document.getElementById('ui-hint');

// ======================== Пресеты ========================

const PRESETS = {
  forest: {
    hue: 142, sat: 60, lum: 48,
    pulseAmp: 0.03,
    particles: 100,
    formation: 'sphere',
    baseFreq: 110,
  },
  city: {
    hue: 30, sat: 85, lum: 55,
    pulseAmp: 0.06,
    particles: 300,
    formation: 'sphere',
    baseFreq: 110,
  },
  space: {
    hue: 260, sat: 65, lum: 55,
    pulseAmp: 0.1,
    particles: 1500,
    formation: 'sphere',
    baseFreq: 55,
  },
  cyberpunk: {
    hue: 330, sat: 90, lum: 55,
    pulseAmp: 0.14,
    particles: 2000,
    formation: 'disk',
    baseFreq: 65,
  },
  ocean: {
    hue: 185, sat: 75, lum: 50,
    pulseAmp: 0.04,
    particles: 200,
    formation: 'sphere',
    baseFreq: 80,
  },
};

const PRESET_NAMES = Object.keys(PRESETS);

// ======================== Состояние ========================

let currentPreset = null;

const state = { hue: 142, sat: 60, lum: 48, pulseAmp: 0.03 };
const target = { hue: 142, sat: 60, lum: 48, pulseAmp: 0.03 };

let bass = 1.0;
let treble = 0.005;
let entrance = 0;

// ======================== Three.js — сцена ========================

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  45, container.clientWidth / container.clientHeight, 0.1, 100,
);
camera.position.z = 3.8;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
} catch (e) {
  container.innerHTML = '<div class="error">WebGL not supported — try a different browser.</div>';
  throw e;
}
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
container.appendChild(renderer.domElement);

// ======================== Bloom ========================

let composer = null;

try {
  composer = new THREE.EffectComposer(renderer);
  const renderPass = new THREE.RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new THREE.UnrealBloomPass(
    new THREE.Vector2(container.clientWidth, container.clientHeight),
    0.3, 0.5, 0.1,
  );
  composer.addPass(bloomPass);
} catch (e) {
  console.warn('Bloom unavailable:', e.message);
}

// ======================== Звёздный фон ========================

function createStars() {
  const geo = new THREE.BufferGeometry();
  const count = 2000;
  const pos = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 80;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 80;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 80 - 20;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.04,
    transparent: true,
    opacity: 0.25,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const stars = new THREE.Points(geo, mat);
  scene.add(stars);
  return stars;
}

const starField = createStars();

// ======================== Сфера (Fresnel Shader) ========================

const fresnelVert = `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vNormal   = normalize(normalMatrix * normal);
    vViewDir  = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fresnelFrag = `
  uniform vec3  uColor1;
  uniform vec3  uColor2;
  uniform float uFresnelPower;
  uniform float uIntensity;
  varying vec3  vNormal;
  varying vec3  vViewDir;

  void main() {
    vec3  n  = normalize(vNormal);
    vec3  v  = normalize(vViewDir);
    float f  = 1.0 - max(dot(v, n), 0.0);
    f        = pow(f, uFresnelPower) * uIntensity;
    vec3 c   = mix(uColor1, uColor2, f);
    gl_FragColor = vec4(c, 1.0);
  }
`;

const sphereMat = new THREE.ShaderMaterial({
  uniforms: {
    uColor1: { value: new THREE.Color(0x1a6b37) },
    uColor2: { value: new THREE.Color(0x4ade80) },
    uFresnelPower: { value: 2.5 },
    uIntensity: { value: 0.8 },
  },
  vertexShader: fresnelVert,
  fragmentShader: fresnelFrag,
});

const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), sphereMat);
scene.add(sphere);

// ======================== Glow-оболочка ========================

const glowMat = new THREE.MeshBasicMaterial({
  color: 0x22c55e,
  transparent: true,
  opacity: 0.1,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const glow = new THREE.Mesh(new THREE.SphereGeometry(1.06, 32, 32), glowMat);
scene.add(glow);

// ======================== Кольцо ========================

const ringMat = new THREE.MeshBasicMaterial({
  color: 0x4ade80,
  transparent: true,
  opacity: 0.1,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const ring = new THREE.Mesh(new THREE.RingGeometry(1.35, 1.7, 64), ringMat);
ring.rotation.x = Math.PI / 3.2;
ring.rotation.z = 0.15;
scene.add(ring);

// ======================== Частицы ========================

let particles = null;
let particleCount = 0;

function createParticles(count, hue, sat, lum, formation) {
  if (particles) {
    scene.remove(particles);
    particles.geometry.dispose();
    particles.material.dispose();
    particles = null;
  }

  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    if (formation === 'disk') {
      const radius = 1.6 + Math.random() * 2.8;
      const angle  = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * 0.35;
      positions[i * 3]     = radius * Math.cos(angle);
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = radius * Math.sin(angle);
    } else {
      const r     = 1.6 + Math.random() * 3.5;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color: new THREE.Color(`hsl(${hue}, ${sat}%, ${Math.min(lum + 30, 92)}%)`),
    size: 0.025,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    depthWrite: false,
  });

  particles = new THREE.Points(geo, mat);
  scene.add(particles);
  particleCount = count;
}

// ======================== Целевые цвета для lerp ========================

const targetC1 = new THREE.Color(0x1a6b37);
const targetC2 = new THREE.Color(0x4ade80);
const targetGlow = new THREE.Color(0x22c55e);
const targetRing = new THREE.Color(0x4ade80);
const targetParticle = new THREE.Color(0x4ade80);

// ======================== Аудио (Web Audio API) ========================

const audio = { ctx: null, started: false };

function createImpulseResponse(ctx, duration, decay) {
  const len = ctx.sampleRate * duration;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

function addOscillator(freq, detune, gainValue) {
  const osc = audio.ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = freq;
  osc.detune.value = detune;
  const gain = audio.ctx.createGain();
  gain.gain.value = gainValue;
  osc.connect(gain);
  gain.connect(audio.masterGain);
  osc.start();
  audio.oscillators.push({ osc, gain, baseFreq: freq, detune });
}

function stopOscillators(time) {
  for (const o of audio.oscillators) {
    o.osc.stop(time);
  }
  audio.oscillators = [];
}

function ensureAudio() {
  if (audio.started) return;

  audio.ctx = new (window.AudioContext || window.webkitAudioContext)();

  // Master gain (громкость)
  audio.masterGain = audio.ctx.createGain();
  audio.masterGain.gain.value = 0;

  // Low-pass filter
  audio.filter = audio.ctx.createBiquadFilter();
  audio.filter.type = 'lowpass';
  audio.filter.frequency.value = 800;
  audio.filter.Q.value = 0.7;

  // Analyser
  audio.analyser = audio.ctx.createAnalyser();
  audio.analyser.fftSize = 256;
  audio.analyserData = new Uint8Array(audio.analyser.frequencyBinCount);

  // Stereo Panner
  audio.panner = audio.ctx.createStereoPanner();
  audio.panner.pan.value = 0;

  // Tremolo node (модуляция громкости — динамика)
  audio.tremoloNode = audio.ctx.createGain();
  audio.tremoloNode.gain.value = 1;

  // Delay
  audio.delay = audio.ctx.createDelay(1);
  audio.delay.delayTime.value = 0.28;
  audio.delayFeedback = audio.ctx.createGain();
  audio.delayFeedback.gain.value = 0.25;
  audio.delayWet = audio.ctx.createGain();
  audio.delayWet.gain.value = 0.12;
  audio.delay.connect(audio.delayWet);
  audio.delay.connect(audio.delayFeedback);
  audio.delayFeedback.connect(audio.delay);

  // Reverb (синтезированный импульс)
  audio.reverb = audio.ctx.createConvolver();
  audio.reverb.buffer = createImpulseResponse(audio.ctx, 1.8, 3.5);
  audio.reverbWet = audio.ctx.createGain();
  audio.reverbWet.gain.value = 0.18;

  // --- Routing ---
  // Dry: masterGain → analyser → filter → tremoloNode → panner → dest
  audio.masterGain.connect(audio.analyser);
  audio.analyser.connect(audio.filter);
  audio.filter.connect(audio.tremoloNode);
  audio.tremoloNode.connect(audio.panner);
  audio.panner.connect(audio.ctx.destination);

  // Wet: filter → delay → delayWet → dest
  audio.filter.connect(audio.delay);
  audio.delayWet.connect(audio.ctx.destination);

  // Wet: filter → reverb → reverbWet → dest
  audio.filter.connect(audio.reverb);
  audio.reverb.connect(audio.reverbWet);
  audio.reverbWet.connect(audio.ctx.destination);

  // Filter LFO (дыхание, агрессивнее)
  audio.lfo = audio.ctx.createOscillator();
  audio.lfo.type = 'sine';
  audio.lfo.frequency.value = 0.5;
  audio.lfoGain = audio.ctx.createGain();
  audio.lfoGain.gain.value = 300;
  audio.lfo.connect(audio.lfoGain);
  audio.lfoGain.connect(audio.filter.frequency);
  audio.lfo.start();

  // 3 oscillators: main, sub (octave down), fifth
  audio.oscillators = [];
  const p = PRESETS[currentPreset] || PRESETS.forest;
  const freq = p.baseFreq * bass;
  addOscillator(freq, 0, 0.5);
  addOscillator(freq / 2, -2, 0.35);
  addOscillator(freq * 1.5, 3, 0.15);

  // Плавная атака
  const now = audio.ctx.currentTime;
  audio.masterGain.gain.setValueAtTime(0, now);
  audio.masterGain.gain.linearRampToValueAtTime(0.35, now + 0.8);
  audio.filter.frequency.setValueAtTime(150, now);
  audio.filter.frequency.linearRampToValueAtTime(200 + bass * 600, now + 0.8);

  audio.started = true;
}

function updateAudio() {
  if (!audio.ctx || !audio.oscillators.length) return;
  const now = audio.ctx.currentTime;

  const cutoff = 200 + bass * 500;
  const vol = 0.15 + treble * 18;

  for (const o of audio.oscillators) {
    o.osc.frequency.setTargetAtTime(o.baseFreq * bass, now, 0.05);
  }
  audio.filter.frequency.setTargetAtTime(cutoff, now, 0.05);
  audio.masterGain.gain.setTargetAtTime(vol, now, 0.05);
}

function changeAudioPreset(name) {
  if (!audio.ctx || !audio.oscillators.length) return;

  const p = PRESETS[name];
  const now = audio.ctx.currentTime;

  audio.masterGain.gain.setTargetAtTime(0, now, 0.05);

  for (const o of audio.oscillators) {
    o.osc.stop(now + 0.2);
  }
  audio.oscillators = [];

  const freq = p.baseFreq * bass;
  addOscillator(freq, 0, 0.5);
  addOscillator(freq / 2, -2, 0.35);
  addOscillator(freq * 1.5, 3, 0.15);

  const cutoff = 200 + bass * 500;
  const vol = 0.15 + treble * 18;
  audio.filter.frequency.setTargetAtTime(cutoff, now + 0.2, 0.08);
  audio.masterGain.gain.setTargetAtTime(vol, now + 0.2, 0.08);
}

// ======================== Применение пресета ========================

function applyPreset(name) {
  const p = PRESETS[name];
  if (!p || name === currentPreset) return;

  presetBtns.forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`[data-preset="${name}"]`);
  if (btn) btn.classList.add('active');

  Object.assign(target, p);

  const lum1 = Math.max(p.lum - 18, 10);
  const lum2 = Math.min(p.lum + 22, 88);
  targetC1.setHSL(p.hue / 360, p.sat / 100, lum1 / 100);
  targetC2.setHSL(p.hue / 360, p.sat / 100, lum2 / 100);
  targetGlow.setHSL(p.hue / 360, p.sat / 100, (lum2 - 5) / 100);
  targetRing.setHSL(p.hue / 360, Math.min(p.sat * 0.8, 100) / 100, Math.min(lum2 + 5, 90) / 100);
  targetParticle.setHSL(p.hue / 360, p.sat / 100, Math.min(lum2, 88) / 100);

  if (Math.abs(particleCount - p.particles) > 50) {
    createParticles(p.particles, p.hue, p.sat, p.lum, p.formation);
  }

  if (audio.started) changeAudioPreset(name);

  currentPreset = name;
}

// ======================== Random ========================

function getRandomPreset() {
  const others = PRESET_NAMES.filter(n => n !== currentPreset);
  return others[Math.floor(Math.random() * others.length)];
}

// ======================== Tooltip ========================

function updateTooltip(input, tooltip, value) {
  const min = parseFloat(input.min);
  const max = parseFloat(input.max);
  const pct = ((value - min) / (max - min)) * 100;
  tooltip.textContent = input.id === 'bass' ? value.toFixed(2) : value.toFixed(3);
  tooltip.style.left = pct + '%';
}

// ======================== Help ========================

function toggleHelp() {
  helpOverlay.classList.toggle('open');
}

function closeHelp() {
  helpOverlay.classList.remove('open');
}

// ======================== UI Toggle (Zen Mode) ========================

let uiHintTimer = null;

function toggleUI() {
  const app = document.getElementById('app');
  const hidden = app.classList.toggle('hidden');
  fpsEl.classList.toggle('hidden', hidden);
  uiToggle.classList.toggle('show', hidden);

  if (hidden) {
    if (helpOverlay.classList.contains('open')) closeHelp();
    uiHint.classList.add('show');
    clearTimeout(uiHintTimer);
    uiHintTimer = setTimeout(() => uiHint.classList.remove('show'), 3000);
  } else {
    uiHint.classList.remove('show');
    clearTimeout(uiHintTimer);
  }
}

function showUI() {
  const app = document.getElementById('app');
  if (!app.classList.contains('hidden')) return;
  app.classList.remove('hidden');
  fpsEl.classList.remove('hidden');
  uiToggle.classList.remove('show');
  uiHint.classList.remove('show');
  clearTimeout(uiHintTimer);
}

// ======================== Saved presets ========================

const SAVE_KEY = 'moodweaver_presets';

function getSavedPresets() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || []; }
  catch { return []; }
}

function persistSavedPresets(presets) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(presets));
}

function saveCurrentPreset() {
  const name = savedName.value.trim();
  if (!name || !currentPreset) return;

  const presets = getSavedPresets();
  presets.push({ id: Date.now(), name, preset: currentPreset, bass, treble });
  persistSavedPresets(presets);
  savedName.value = '';
  renderSavedPresets();
}

function deleteSavedPreset(id) {
  const presets = getSavedPresets().filter(p => p.id !== id);
  persistSavedPresets(presets);
  renderSavedPresets();
}

function loadSavedPreset(data) {
  bass = data.bass;
  treble = data.treble;
  bassInput.value = bass;
  trebleInput.value = treble;
  bassValueEl.textContent = bass.toFixed(2);
  trebleValueEl.textContent = treble.toFixed(3);
  updateTooltip(bassInput, bassTooltip, bass);
  updateTooltip(trebleInput, trebleTooltip, treble);
  applyPreset(data.preset);
  if (audio.started) updateAudio();
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function renderSavedPresets() {
  const presets = getSavedPresets();
  if (!presets.length) {
    savedList.innerHTML = '<div class="saved-empty">No saved presets yet</div>';
    return;
  }

  savedList.innerHTML = presets.map(p => `
    <div class="saved-item" role="listitem">
      <button class="saved-load-btn" data-id="${p.id}">${escapeHtml(p.name)}</button>
      <button class="saved-del-btn" data-id="${p.id}" aria-label="Delete ${escapeHtml(p.name)}">×</button>
    </div>
  `).join('');

  savedList.querySelectorAll('.saved-load-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      const data = getSavedPresets().find(p => p.id === id);
      if (data) loadSavedPreset(data);
    });
  });

  savedList.querySelectorAll('.saved-del-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      deleteSavedPreset(parseInt(btn.dataset.id));
    });
  });
}

// ======================== Resize ========================

let resizeRaf = null;

function onResize() {
  if (resizeRaf) cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(() => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    if (composer) composer.setSize(w, h);
    resizeRaf = null;
  });
}

// ======================== Animation Loop ========================

let frameCount = 0;
let lastFpsUpdate = 0;

function animate(time) {
  requestAnimationFrame(animate);

  const LERP = 0.06;

  // --- Audio reactivity ---
  let avgFreq = 0;
  if (audio.analyser) {
    audio.analyser.getByteFrequencyData(audio.analyserData);
    let sum = 0;
    for (let i = 0; i < audio.analyserData.length; i++) sum += audio.analyserData[i];
    avgFreq = sum / audio.analyserData.length / 255;
  }

  // --- Stereo panning ---
  if (audio.panner) {
    audio.panner.pan.value = Math.sin(sphere.rotation.y) * 0.6;
  }

  // --- Tremolo (динамика громкости) ---
  if (audio.tremoloNode) {
    const tSpeed = 2 + state.pulseAmp * 20;
    const tDepth = 0.12 + state.pulseAmp * 1.2;
    audio.tremoloNode.gain.value = 1 - Math.sin(time * 0.001 * tSpeed * Math.PI * 2) * tDepth;
  }

  // --- Интерполяция ---
  state.hue      += (target.hue - state.hue) * LERP;
  state.sat      += (target.sat - state.sat) * LERP;
  state.lum      += (target.lum - state.lum) * LERP;
  state.pulseAmp += (target.pulseAmp - state.pulseAmp) * LERP;

  // --- CSS-переменные ---
  const root = document.documentElement;
  root.style.setProperty('--hue', String(Math.round(state.hue)));
  root.style.setProperty('--sat', `${Math.round(state.sat)}%`);
  root.style.setProperty('--lum', `${Math.round(state.lum)}%`);

  // --- Lerp цветов ---
  sphereMat.uniforms.uColor1.value.lerp(targetC1, LERP);
  sphereMat.uniforms.uColor2.value.lerp(targetC2, LERP);
  glowMat.color.lerp(targetGlow, LERP);
  ringMat.color.lerp(targetRing, LERP);
  if (particles) particles.material.color.lerp(targetParticle, LERP);

  // --- Пульсация ---
  const puls = 1 + Math.sin(time * 0.0018) * state.pulseAmp;
  const scale = bass * puls;

  // --- Audio-reactive модуляция ---
  const audioPush = 1 + avgFreq * 0.3;
  const particleSize = 0.025 + avgFreq * 0.045;
  const glowPulse = 0.08 + avgFreq * 0.2;
  const fresnelIntensity = 0.7 + avgFreq * 0.35;

  sphereMat.uniforms.uIntensity.value += (fresnelIntensity - sphereMat.uniforms.uIntensity.value) * 0.1;

  // --- Начальная анимация ---
  if (entrance < 1) {
    entrance = Math.min(entrance + 0.025, 1);
    const ease = 1 - (1 - entrance) ** 3;
    sphere.scale.setScalar(scale * audioPush * ease);
    glow.scale.setScalar(scale * audioPush * 1.06 * ease);
    ring.scale.setScalar(scale * audioPush * ease);
    if (particles) {
      particles.material.opacity = 0.7 * ease;
      particles.material.size = particleSize;
    }
  } else {
    sphere.scale.setScalar(scale * audioPush);
    glow.scale.setScalar(scale * audioPush * 1.06);
    ring.scale.setScalar(scale * audioPush);
    if (particles) {
      particles.material.opacity = 0.7;
      particles.material.size = particleSize;
    }
  }

  glowMat.opacity += (glowPulse - glowMat.opacity) * 0.08;

  // --- Вращение сферы ---
  sphere.rotation.y += treble;
  sphere.rotation.x += treble * 0.12;
  glow.rotation.y  += treble * 0.7;
  glow.rotation.x  += treble * 0.08;

  // --- Вращение кольца ---
  ring.rotation.y += treble * 0.35;
  ring.rotation.z += treble * 0.04;
  ringMat.opacity = 0.1 + Math.sin(time * 0.0015) * state.pulseAmp * 0.5;

  // --- Вращение частиц ---
  if (particles) {
    particles.rotation.y += treble * 0.25;
    particles.rotation.x += treble * 0.08;
  }

  // --- Медленное вращение звезд ---
  starField.rotation.y += 0.0001;

  // --- FPS ---
  frameCount++;
  if (time - lastFpsUpdate >= 1000) {
    fpsEl.textContent = `${frameCount} FPS`;
    frameCount = 0;
    lastFpsUpdate = time;
  }

  if (composer) composer.render();
  else renderer.render(scene, camera);
}

// ======================== События ========================

// Пресеты
presetBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const name = btn.dataset.preset;
    if (name) applyPreset(name);
  });
});

// Random
randomBtn.addEventListener('click', () => {
  const name = getRandomPreset();

  bass = +(0.5 + Math.random() * 1.5).toFixed(2);
  treble = +(Math.random() * 0.02).toFixed(3);

  bassInput.value = bass;
  trebleInput.value = treble;
  bassValueEl.textContent = bass.toFixed(2);
  trebleValueEl.textContent = treble.toFixed(3);

  updateTooltip(bassInput, bassTooltip, bass);
  updateTooltip(trebleInput, trebleTooltip, treble);

  applyPreset(name);
  if (audio.started) updateAudio();
});

// Bass
bassInput.addEventListener('input', () => {
  bass = parseFloat(bassInput.value);
  bassValueEl.textContent = bass.toFixed(2);
  updateTooltip(bassInput, bassTooltip, bass);
  if (audio.started) updateAudio();
});

// Treble
trebleInput.addEventListener('input', () => {
  treble = parseFloat(trebleInput.value);
  trebleValueEl.textContent = treble.toFixed(3);
  updateTooltip(trebleInput, trebleTooltip, treble);
  if (audio.started) updateAudio();
});

// Resize
window.addEventListener('resize', onResize);

// Хоткеи
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  if (!audio.started) ensureAudio();

  if (e.code >= 'Digit1' && e.code <= 'Digit5') {
    const idx = parseInt(e.code.slice(5)) - 1;
    if (idx < PRESET_NAMES.length) applyPreset(PRESET_NAMES[idx]);
  }

  if (e.code === 'KeyR') {
    e.preventDefault();
    randomBtn.click();
  }

  if (e.code === 'KeyF') {
    e.preventDefault();
    const el = document.fullscreenElement || document.webkitFullscreenElement;
    if (!el) {
      const req = (document.documentElement.requestFullscreen?.()
                || document.documentElement.webkitRequestFullscreen?.());
      if (req) req.catch(() => {});
    } else {
      const ex = document.exitFullscreen?.() || document.webkitExitFullscreen?.();
      if (ex) ex.catch(() => {});
    }
  }

  if (e.code === 'KeyH') {
    e.preventDefault();
    toggleHelp();
  }
  if (e.code === 'KeyU') {
    e.preventDefault();
    toggleUI();
  }
  if (e.code === 'Escape') closeHelp();
});

// UI Toggle
uiToggle.addEventListener('click', toggleUI);
container.addEventListener('click', showUI);

// Help
helpBtn.addEventListener('click', toggleHelp);
helpClose.addEventListener('click', closeHelp);
helpOverlay.addEventListener('click', (e) => {
  if (e.target === helpOverlay) closeHelp();
});

// Saved presets
savedSaveBtn.addEventListener('click', saveCurrentPreset);
savedName.addEventListener('keydown', (e) => {
  if (e.code === 'Enter') saveCurrentPreset();
});

// Запуск аудио по первому взаимодействию
document.addEventListener('click', ensureAudio, { once: true });
document.addEventListener('touchstart', ensureAudio, { once: true });

// ======================== Старт ========================

createParticles(PRESETS.forest.particles, 142, 60, 48, 'sphere');
applyPreset('forest');
renderSavedPresets();

// Начальная позиция тултипов
updateTooltip(bassInput, bassTooltip, bass);
updateTooltip(trebleInput, trebleTooltip, treble);

animate(0);
