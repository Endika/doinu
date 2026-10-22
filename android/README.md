# Doinu 安卓离线版（手指标记 · 麦克风）

把 Doinu 这个网页版钢琴练习 App 包成 **离线 APK**，装到安卓平板上给孩子用。
不需要联网、不需要 Google 服务、不需要 Chrome、不需要 MIDI 线。

本目录只放 Android 外壳；网页部分就是仓库根目录的 Doinu 源码（已含手指标记与中文化改动）。

---

## 这个外壳做了什么

| 事项 | 做法 | 为什么 |
|---|---|---|
| 离线加载网页 | `WebViewAssetLoader` 把 `assets/www` 映射到 `https://appassets.androidplatform.net/assets/www/` | 麦克风（`getUserMedia`）只在**安全上下文**可用，`file://` 不是安全上下文，会直接拿不到麦克风 |
| 麦克风授权 | 清单里 `RECORD_AUDIO`，启动时申请，`WebChromeClient.onPermissionRequest` 里放行音频采集 | WebView 默认拒绝所有权限请求 |
| 声音不需要点一下才响 | `setMediaPlaybackRequiresUserGesture(false)` | App 自己会播放提示音 |
| 强制走麦克风 | 构建时往 `index.html` 注入一段脚本，删掉 `navigator.requestMIDIAccess` | **坑**：安卓 WebView 里这个 API 存在但连不上任何设备，Doinu 据此以为「有 MIDI」而选错输入源，结果完全没有输入。WebView 本来就支持不了 Web MIDI，所以干脆藏掉 |
| 横屏 / 全屏 | `sensorLandscape` + immersive flags + `FLAG_KEEP_SCREEN_ON` | 谱架上看，不熄屏 |
| 布局不跑偏 | 网页侧：画布尺寸没就绪时跳过、每帧重新贴合 CSS 尺寸、`#keys` 加 `min-height:0` | **坑**：WebView 首帧 `clientHeight` 是 0，原代码回退到 `window.innerHeight`，把画布设成整窗高；而 flex 子项的最小尺寸又跟随内容，布局被锁死，整个舞台被垂直拉伸（手指标记跟着变形） |

APK 里没有原生库，只有 Java + WebView，所以体积约 470 KB，任何 ABI 都能装。

---

## 构建

### 前置

- Node.js 20+（仓库根目录 `npm install` 过）
- JDK 17 或 21
- Android SDK：
  - `platforms/android-34`
  - `build-tools/34.0.0`
- Gradle 8.7+（或用 Android Studio 自带的）

### 步骤

```bash
# 1. 先构建网页（在仓库根目录）
npm install
npm run build          # 产出 dist/

# 2. 把 dist 塞进 assets，并做麦克风版改造
node android/sync-assets.mjs

# 3. 打包
cd android
./gradlew assembleRelease
```

产物：`android/app/build/outputs/apk/release/app-release.apk`

`local.properties` 不进版本库，需要自己写一行 SDK 路径：

```properties
sdk.dir=/path/to/Android/sdk
```

或者直接设环境变量 `ANDROID_HOME`。

### 没有 Gradle wrapper

仓库里没有提交 `gradlew`（避免几十 MB 的 wrapper jar）。用系统装的 Gradle 即可：

```bash
gradle assembleRelease
```

想加 wrapper 就 `cd android && gradle wrapper --gradle-version 8.7`。

---

## 签名

`doinu-release.keystore` 是**提交进仓库的**，口令写在 `app/build.gradle` 里：

```
alias: doinu
storePassword / keyPassword: doinu-kid-2026
```

这是刻意的：自己家里用的 APK，保留同一个密钥才能在平板上**覆盖安装**（换密钥安装会失败，只能卸载重装，进度数据会丢）。
如果哪天要放到应用商店，请重新生成密钥并把这个文件从仓库里移除。

---

## 目录

```
android/
├── settings.gradle
├── build.gradle                 # AGP 8.5.2
├── gradle.properties
├── local.properties             # 不进版本库
├── doinu-release.keystore       # 自签名密钥
├── sync-assets.mjs              # dist/ -> app/src/main/assets/www + 麦克风版改造
└── app/
    ├── build.gradle             # compileSdk 34 / minSdk 24 / targetSdk 34
    └── src/main/
        ├── AndroidManifest.xml
        ├── java/net/doinu/kid/MainActivity.java
        └── res/                 # 图标、主题、文案
```

`app/src/main/assets/www/` 是构建产物，不进版本库。

---

## 已知限制

- 麦克风一次只能听一个音：**和弦、双手用不了**。那两块要 MIDI（`USB TO HOST`），需要 Chrome + Web MIDI 或原生 USB MIDI，跟这个外壳是两条路。
- 没有手型演示（坐姿、手腕、手指立起来）。这个 App 只管「哪个音、用哪根指」。
- 音高识别依赖环境安静，首次使用建议在「麦克风测试」里做一次校准。
