# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

- `yarn build` — compile TypeScript (`src/` → `dist/`)
- `yarn start` — run the app with Electron (must build first)
- `yarn package` — build distributable for current platform (auto-runs `yarn build` via prepackage hook). Output goes to `out/`

## Architecture

Tray-based Electron app (no dock icon) that periodically pops up a posture reminder image at the cursor position. Localized for Korean and English (auto-detected from system locale).

### Process Model

**Main process** (`src/main.ts`): App lifecycle, tray menu, window management, config persistence via `electron-store`. Manages two windows:
- **Popup window** (frameless, transparent, 256x256): Blinks 3 times rapidly (100ms on/80ms off) at cursor, then stays visible with an acknowledge button that dismisses it. Renderer: `public/index.html`.
- **Picker window** (standard frame): Grid-based image selector for choosing/managing reminder images. Supports selecting built-in samples, adding custom images, removing them, and renaming via double-click. Renderer: `public/picker.html`.

**Preload scripts**: Each window has its own preload (`src/preload.ts` for picker, `src/popup-preload.ts` for popup) exposing typed APIs via `contextBridge`. All windows use `contextIsolation: true`.

### IPC Channels

- `select-image`, `add-custom-image`, `remove-custom-image`, `rename-custom-image` — picker window actions
- `acknowledge` — popup dismiss (hides window and reloads to reset button state)
- `images-updated` — main→picker, carries `{images, selected, strings}` payload
- `show-ack` — main→popup, shows the acknowledge button after blinking

### Localization

`src/i18n.ts` provides translations for `ko` and `en`. Locale is auto-detected from `Intl.DateTimeFormat().resolvedOptions().locale`, defaulting to `en` for non-Korean locales. All user-facing strings (tray menu, picker UI, popup button, dialog titles) are localized.

Renderer strings are passed from main process: popup gets localized button text via query param (`?ack=`), picker gets a `strings` object via the `images-updated` IPC payload. Picker HTML `<title>` must be empty so the BrowserWindow `title` property (set in main process) takes effect.

### Config Schema (electron-store)

- `interval: number` — popup interval in ms (default 60000)
- `image: string` — current image key. Format: `sample:<filename>` for built-in, absolute path for custom
- `customImages: {path, name}[]` — user-added images with custom display names

### Asset Bundling

All binary assets live in `assets/` and are bundled via `extraResources` in `electron-builder.yml` (outside the asar archive). Use `getAssetsDir()` to resolve paths — it handles packaged vs dev environments. The `public/` directory is for HTML renderers only.

Tray icons are theme-aware with multi-resolution support: `trayicon_light.png` (for dark theme) and `trayicon_dark.png` (for light theme) at 1x (16x16), @2x (32x32), and @3x (48x48). Electron auto-picks `@2x`/`@3x` variants on all platforms. Theme switching is handled via `nativeTheme.on('updated')`.

### Icon Generation

To regenerate app icons from `assets/icon.png`:
- **macOS**: Create iconset with `sips` at standard sizes (16–512 + @2x), then `iconutil -c icns` → `assets/icon.icns`
- **Windows**: Resize to 256x256 with `sips -s format ico` → `assets/icon.ico`
- **Tray icons**: Generate from source PNGs at root (`trayicon_light.png`, `trayicon_dark.png`) using `sips -z` for 16x16, 32x32, 48x48 → `assets/trayicon_{variant}.png`, `assets/trayicon_{variant}@2x.png`, `assets/trayicon_{variant}@3x.png`

### macOS Menu Bar Note

On macOS, top-level menu bar items **must** have a `submenu` — items with only a `click` handler are silently ignored. This app uses a tray context menu instead, which doesn't have this restriction.
