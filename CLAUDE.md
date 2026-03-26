# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

- `yarn build` — compile TypeScript (`src/` → `dist/`)
- `yarn start` — run the app with Electron (must build first)
- `yarn package` — build distributable for current platform (auto-runs `yarn build` via prepackage hook). Output goes to `out/`

## Architecture

Tray-based Electron app (no dock icon) that periodically pops up a posture reminder image at the cursor position. UI language is Korean.

### Process Model

**Main process** (`src/main.ts`): App lifecycle, tray menu, window management, config persistence via `electron-store`. Manages two windows:
- **Popup window** (frameless, transparent, 256x256): Blinks 3 times at cursor, then stays visible with an acknowledge button. Renderer: `public/index.html`.
- **Picker window** (standard frame): Grid-based image selector for choosing/managing reminder images. Renderer: `public/picker.html`.

**Preload scripts**: Each window has its own preload (`src/preload.ts` for picker, `src/popup-preload.ts` for popup) exposing typed APIs via `contextBridge`. All windows use `contextIsolation: true`.

### IPC Channels

- `select-image`, `add-custom-image`, `remove-custom-image`, `rename-custom-image` — picker window actions
- `acknowledge` — popup dismiss
- `images-updated`, `show-ack` — main→renderer events

### Config Schema (electron-store)

- `interval: number` — popup interval in ms (default 60000)
- `image: string` — current image key. Format: `sample:<filename>` for built-in, absolute path for custom
- `customImages: {path, name}[]` — user-added images with custom display names

### Asset Bundling

All binary assets live in `assets/` and are bundled via `extraResources` in `electron-builder.yml` (outside the asar archive). Use `getAssetsDir()` to resolve paths — it handles packaged vs dev environments. The `public/` directory is for HTML renderers only.

Tray icons are theme-aware: `trayicon_light.png` (for dark theme) and `trayicon_dark.png` (for light theme), auto-switching via `nativeTheme`.

### Icon Generation

To regenerate app icons from `assets/icon.png`:
- **macOS**: Create iconset with `sips` at standard sizes, then `iconutil -c icns` → `assets/icon.icns`
- **Windows**: Resize to 256x256 with `sips -s format ico` → `assets/icon.ico`
