# Doinu 安卓离线版（手指标记 · 麦克风 / MIDI 双外壳）

把 Doinu 这个网页版钢琴练习 App 包成 **离线 APK**，装到安卓平板上给孩子用。
不需要联网、不需要 Google 服务、不需要 Chrome。

两个外壳：**麦克风版**（`sync-assets.mjs`，无琴也能玩，但注意平板喇叭会啸叫）
和 **MIDI 版**（`sync-midi.mjs`，用雅马哈 P-225 的 USB TO HOST 接平板，推荐）。

本目录只放 Android 外壳；网页部分就是仓库根目录的 Doinu 源码（已含手指标记与中文化改动）。

---

## 这个外壳做了什么

| 事项 | 做法 | 为什么 |
|---|---|---|
| 离线加载网页 | `WebViewAssetLoader` 把 `assets/www` 映射到 `https://appassets.androidplatform.net/assets/www/` | 麦克风（`getUserMedia`）和 Web MIDI 都只在**安全上下文**可用，`file://` 不是安全上下文 |
| MIDI 输入 | 原生 `MidiManager` 扫描并打开 class-compliant USB MIDI 设备，note on/off 经 `evaluateJavascript` 批量推给页面；页面注入一个 Web MIDI shim（`navigator.requestMIDIAccess` → 单个 input，`onmidimessage` 发 `MIDIMessageEvent`），Doinu 的 `MidiInputAdapter` 原样工作 | Android 的 `MidiManager` 系统服务走 USB class 驱动，**不需要装 Chrome、不需要 USB 授权流**；WebView 本身没有 Web MIDI，所以用原生桥 + shim |
| 麦克风版 | 构建时删掉 `navigator.requestMIDIAccess`，强制走麦克风 | 麦克风版是给「没有琴」的兜底。WebView 里那个 API 存在但连不上设备，会让 Doinu 选错输入源 |
| 不啸叫 | MIDI 版注入 `window.__DOINU_MUTE_INPUT_SYNTH=true`，网页对「用户按键」不再回响合成器（钢琴自己发声）；示范/跟弹播放仍由平板发声 | 麦克风版啸叫的根因是平板喇叭→麦克风回环；MIDI 版声音全在琴上，物理上无回环 |
| 声音不需要点一下才响 | `setMediaPlaybackRequiresUserGesture(false)` | App 播放示范音 |
| 横屏 / 全屏 | `sensorLandscape` + immersive flags + `FLAG_KEEP_SCREEN_ON` | 谱架上看，不熄屏 |
| 布局不跑偏 | 网页侧：画布尺寸没就绪时跳过、每帧重新贴合 CSS 尺寸、`#keys` 加 `min-height:0` | **坑**：WebView 首帧 `clientHeight` 是 0，原代码回退到 `window.innerHeight`，flex 布局被锁死、整屏被拉伸（手指标记跟着变形） |

APK 里没有原生库，只有 Java + WebView，约 480 KB，任何 ABI 都能装。

---

## 构建

### 前置

- Node.js 20+（仓库根目录 `npm install` 过）
- JDK 17 或 21
- Android SDK：`platforms/android-34`、`build-tools/34.0.0`
- Gradle 8.7+（或用 Android Studio 自带的）

### 步骤

```bash
# 1. 先构建网页（在仓库根目录）
npm install
npm run build          # 产出 dist/

# 2a. MIDI 版（推荐）
node android/sync-midi.mjs

# 2b. 或者 麦克风版
node android/sync-assets.mjs

# 3. 打包
cd android
./gradlew assembleRelease   # 或用系统 gradle：gradle assembleRelease
```

产物：`android/app/build/outputs/apk/release/app-release.apk`

`local.properties` 不进版本库，需要自己写一行：`sdk.dir=/path/to/Android/sdk`（或设 `ANDROID_HOME`）。

### 没有 Gradle wrapper

仓库不提交 `gradlew`（避免几十 MB jar）。用系统 Gradle 即可；想加 wrapper：`cd android && gradle wrapper --gradle-version 8.7`。

---

## 模拟器上自测（没有真琴时）

MuMu 等模拟器**没有 USB MIDI 设备**，甚至部分镜像没有 MIDI 系统服务
（`MidiManager == null`）。为此加了 demo 模式，绕过硬件直接向页面喂音符：

```bash
adb shell am start -n net.doinu.kid/.MainActivity --ez demoMidi true
```

demo 每 ~1.25s 送一个音符（C-D-E-G-C′…），进入「Do Re Mi」等等待模式课程就能看到
课程自动推进、键盘点亮。验证手段：

- `logcat -s DoinuBridge` —— 日志链：`midi in`（Java 收到）→ `flushing`（推页面）→ `[doinu-midi] batch`（shim 收到）。能走通即整条桥 OK。
- 打开 `--ez demoMidi true` 前先关闭之前实例：`am force-stop net.doinu.kid`。

---

## 签名

`doinu-release.keystore` 是**提交进仓库的**，口令写在 `app/build.gradle` 里
（alias `doinu` / `doinu-kid-2026`）。这是刻意的：自己家用的 APK，保留同一密钥
才能**覆盖安装**（换密钥只能卸载重装，进度会丢）。要上架商店请重新生成密钥并
把 keystore 从仓库移除。

---

## 目录

```
android/
├── settings.gradle
├── build.gradle                 # AGP 8.5.2
├── gradle.properties
├── local.properties             # 不进版本库
├── doinu-release.keystore       # 自签名密钥
├── sync-assets.mjs               # 麦克风版：dist/ -> assets/www（删 requestMIDIAccess）
├── sync-midi.mjs                 # MIDI 版：dist/ -> assets/www（注入 Web MIDI shim + 静音）
└── app/
    ├── build.gradle             # compileSdk 34 / minSdk 24 / targetSdk 34
    └── src/main/
        ├── AndroidManifest.xml
        ├── java/net/doinu/kid/MainActivity.java   # WebView + MidiManager 桥 + demo 模式
        └── res/                 # 图标、主题、文案
```

`app/src/main/assets/www/` 是构建产物，不进版本库。

---

## 已知限制

- **MIDI 版**需要一根 USB Type-B → USB-C 数据线（打印机那种，<3m、非 USB 3.0），
  以及支持 USB Host 的平板（Redmi K Pad 支持 OTG）。
- 手型（坐姿、手腕、手指立起来）不教——App 只管「哪个音、用哪根指」。
- 麦克风版：和弦/双手用不了（单音识别），且平板喇叭会啸叫，仅作无琴兜底。
- 真琴的 USB MIDI 必须实机验证（模拟器无 MIDI 硬件）；`logcat -s DoinuBridge`
  的日志链就是为此准备的诊断手段。

