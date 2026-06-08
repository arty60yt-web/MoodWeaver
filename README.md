<p align="center">
  <a href="#ru">🇷🇺 Русский</a> · <a href="#en">🇬🇧 English</a>
</p>

---

<h1 align="center">Mood Weaver</h1>

<p align="center">
  <b>Интерактивный 3D-визуальный синтезатор</b><br>
  Генеративная графика в реальном времени, управляемая звуком.
</p>

---

<h2 align="center" id="ru">🇷🇺 Русский</h2>

Mood Weaver — это браузерная ambient-среда: сфера с Fresnel-шейдером реагирует на пресеты настроения, а многоголосный синтезатор создаёт тёплые, живые звуковые ландшафты.

### Возможности

- **5 пресетов** — Forest, City, Space, Cyberpunk, Ocean — каждый с уникальной цветовой палитрой, формацией частиц и звучанием
- **Многоголосный синтезатор** — 3 слоя синуса (основной, суб-октава, квинта) с расстроем, фильтром низких частот + LFO, стерео-панорамой, тремоло, задержкой и синтезированной реверберацией
- **Аудио-реактивные визуалы** — размер частиц, свечение сферы и интенсивность Fresnel пульсируют от аудиоспектра
- **Bloom (свечение)** — UnrealBloomPass для мягкого свечения сферы и частиц
- **Zen-режим** — нажмите `U`, чтобы скрыть интерфейс и погрузиться в картинку
- **Сохранение пресетов** — сохраняйте любимые комбинации Bass/Treble + preset в localStorage
- **Полноэкранный режим** — `F`
- **Случайный режим** — `R` рандомит и пресет, и ползунки

### Управление

| Клавиша | Действие |
|---------|----------|
| `1`–`5` | Выбрать пресет |
| `R` | Случайный пресет + ползунки |
| `U` | Скрыть/показать интерфейс (Zen) |
| `F` | Полноэкранный режим |
| `H` | Справка |
| `Esc` | Закрыть справку |

**Ползунки:**
- **Bass** — масштаб сферы + частота среза фильтра (яркость lowpass)
- **Treble** — скорость вращения + общая громкость

### Пресеты

| Пресет | Оттенок | Атмосфера |
|--------|---------|-----------|
| Forest | Зелёный (142°) | Медленный, землистый |
| City | Оранжевый (30°) | Средний, тёплый |
| Space | Фиолетовый (260°) | Глубокий, парящий |
| Cyberpunk | Розовый (330°) | Быстрый, глитч, дисковая формация |
| Ocean | Бирюзовый (185°) | Глубокий, текучий |

---

<h2 align="center" id="en">🇬🇧 English</h2>

Mood Weaver is a browser-based ambient experience: a Fresnel-shaded sphere responds to preset moods while a multi-layer synthesizer generates warm, evolving soundscapes.

### Features

- **5 presets** — Forest, City, Space, Cyberpunk, Ocean — each with unique color palettes, particle formations, and audio characteristics
- **Multi-oscillator synth** — 3 sine layers (main, sub octave, fifth) with detune, lowpass filter + LFO, stereo panner, tremolo, delay, and synthetic reverb
- **Audio-reactive visuals** — particle size, sphere glow, and Fresnel intensity pulse with the audio spectrum
- **Bloom post-effect** — UnrealBloomPass for soft glow on the sphere and particles
- **Zen mode** — press `U` to hide the UI and immerse yourself in the visuals
- **Save custom presets** — save your favorite Bass/Treble + preset combinations to localStorage
- **Fullscreen** — toggle with `F`
- **Random** — randomize both preset and sliders with `R`

### Controls

| Key | Action |
|-----|--------|
| `1`–`5` | Select preset |
| `R` | Random preset + sliders |
| `U` | Toggle UI (zen mode) |
| `F` | Toggle fullscreen |
| `H` | Toggle help overlay |
| `Esc` | Close help |

**Sliders:**
- **Bass** — sphere scale + filter cutoff (lowpass brightness)
- **Treble** — rotation speed + master volume

### Presets

| Preset | Hue | Vibe |
|--------|-----|------|
| Forest | Green (142°) | Slow, earthy |
| City | Orange (30°) | Medium, warm |
| Space | Purple (260°) | Deep, floating |
| Cyberpunk | Pink (330°) | Fast, glitchy, disk formation |
| Ocean | Teal (185°) | Deep, flowing |

---

<h2 align="center">Tech Stack</h2>

<p align="center">
  <b>Three.js</b> · <b>Web Audio API</b> · <b>Pure HTML/CSS/JS</b>
</p>

- **Three.js** — 3D rendering, Fresnel ShaderMaterial, EffectComposer + UnrealBloomPass
- **Web Audio API** — OscillatorNode, AnalyserNode, BiquadFilterNode, StereoPannerNode, ConvolverNode (synthetic reverb), DelayNode
- **Pure HTML/CSS/JS** — no frameworks, no build tools, works from `file://` or any static server
- **Glassmorphism UI** — dark theme, HSL-driven accent colors

<h2 align="center">How to Run</h2>

Open `index.html` in any modern browser.

For best results, use a local server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

> **Note:** Three.js and post-processing libraries are loaded from CDN. An internet connection is required on first load.

<h2 align="center">License</h2>

<p align="center">MIT</p>
