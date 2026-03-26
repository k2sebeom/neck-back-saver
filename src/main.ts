import { app, BrowserWindow, dialog, ipcMain, Menu, MenuItemConstructorOptions, nativeTheme, screen, Tray } from 'electron';
import Store, { Schema } from 'electron-store';
import path from 'path';
import url from 'url';
import { getLocale, t } from './i18n';

interface CustomImage {
    path: string;
    name: string;
}

interface Config {
    interval: number;
    image: string;
    customImages: CustomImage[];
}
const schema: Schema<Config> = {
	interval: {
		type: 'number',
		default: 60000,
	},
	image: {
		type: 'string',
		default: 'sample:poster_1.png',
	},
	customImages: {
		type: 'array',
		default: [],
		items: {
			type: 'object',
			properties: {
				path: { type: 'string' },
				name: { type: 'string' },
			},
			required: ['path', 'name'],
		},
	},
};
const store = new Store({ schema });

const locale = getLocale();
const s = t(locale);

const ONEMINUTE: number = 60000;
const BLINK_COUNT: number = 3;
const BLINK_ON_MS: number = 100;
const BLINK_OFF_MS: number = 80;

const SAMPLES = ['poster_1.png', 'poster_2.png', 'poster_3.png', 'poster_4.png', 'poster_5.png'];

let tracker: NodeJS.Timeout | null = null;
let currentInterval: number = store.get('interval', ONEMINUTE * 5);
let currentImage: string = store.get('image', 'sample:poster_1.png');
let customImages: CustomImage[] = store.get('customImages', []);

function getAssetsDir(): string {
    return app.isPackaged
        ? path.join(process.resourcesPath, 'assets')
        : path.join(__dirname, '../assets');
}

function getImageUrl(image: string): string {
    if (image.startsWith('sample:')) {
        const filePath = path.join(getAssetsDir(), 'samples', image.slice(7));
        return url.pathToFileURL(filePath).toString();
    }
    return url.pathToFileURL(image).toString();
}

// --- Popup window ---

let popupWin: BrowserWindow;

function loadImage() {
    popupWin.loadFile(path.join(app.getAppPath(), 'public/index.html'), {
        query: {
            image: getImageUrl(currentImage),
            ack: s.acknowledge,
        },
    });
}

function popup() {
    const pt = screen.getCursorScreenPoint();
    const x = Math.floor(pt.x - popupWin.getSize()[0] / 2);
    const y = Math.floor(pt.y - popupWin.getSize()[1] / 2);
    popupWin.setPosition(x, y, false);

    let blink = 0;
    function showBlink() {
        if (blink >= BLINK_COUNT) {
            // Stay visible and show the acknowledge button
            popupWin.show();
            popupWin.focus();
            popupWin.webContents.send('show-ack');
            return;
        }
        popupWin.show();
        popupWin.focus();
        setTimeout(() => {
            popupWin.hide();
            blink++;
            setTimeout(showBlink, BLINK_OFF_MS);
        }, BLINK_ON_MS);
    }
    showBlink();
}

function setTracker(interval: number) {
    store.set('interval', interval);
    currentInterval = interval;
    if (tracker) clearInterval(tracker);
    tracker = setInterval(popup, currentInterval);
}

function setImage(image: string) {
    store.set('image', image);
    currentImage = image;
    loadImage();
    rebuildMenu();
    sendPickerUpdate();
}

// --- Picker window ---

let pickerWin: BrowserWindow | null = null;

function getAllImages(): { key: string; url: string; label: string }[] {
    const images: { key: string; url: string; label: string }[] = [];
    SAMPLES.forEach((s, i) => {
        images.push({
            key: `sample:${s}`,
            url: getImageUrl(`sample:${s}`),
            label: `${locale === 'ko' ? '포스터' : 'Poster'} ${i + 1}`,
        });
    });
    customImages.forEach((ci) => {
        images.push({
            key: ci.path,
            url: getImageUrl(ci.path),
            label: ci.name,
        });
    });
    return images;
}

function getPickerStrings() {
    return {
        builtInImages: s.builtInImages,
        myImages: s.myImages,
        addImage: s.addImage,
        dblClickToRename: s.dblClickToRename,
    };
}

function sendPickerUpdate() {
    if (pickerWin && !pickerWin.isDestroyed()) {
        pickerWin.webContents.send('images-updated', {
            images: getAllImages(),
            selected: currentImage,
            strings: getPickerStrings(),
        });
    }
}

function openPicker() {
    if (pickerWin && !pickerWin.isDestroyed()) {
        pickerWin.focus();
        return;
    }

    pickerWin = new BrowserWindow({
        width: 520,
        height: 500,
        resizable: true,
        title: s.selectImage,
        webPreferences: {
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    pickerWin.loadFile(path.join(app.getAppPath(), 'public/picker.html'));

    pickerWin.webContents.on('did-finish-load', () => {
        sendPickerUpdate();
    });

    pickerWin.on('closed', () => {
        pickerWin = null;
    });
}

// --- IPC handlers ---

ipcMain.on('select-image', (_event, imageKey: string) => {
    setImage(imageKey);
});

ipcMain.on('add-custom-image', async () => {
    const result = await dialog.showOpenDialog({
        title: s.selectImage,
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] }],
        properties: ['openFile'],
    });
    if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        if (!customImages.some(ci => ci.path === filePath)) {
            const name = path.basename(filePath, path.extname(filePath));
            customImages.push({ path: filePath, name });
            store.set('customImages', customImages);
        }
        setImage(filePath);
    }
});

ipcMain.on('remove-custom-image', (_event, imageKey: string) => {
    customImages = customImages.filter(ci => ci.path !== imageKey);
    store.set('customImages', customImages);
    if (currentImage === imageKey) {
        setImage('sample:poster_1.png');
    } else {
        rebuildMenu();
        sendPickerUpdate();
    }
});

ipcMain.on('acknowledge', () => {
    popupWin.hide();
    // Reload so the ack button is hidden for next popup
    loadImage();
});

ipcMain.on('rename-custom-image', (_event, imageKey: string, newName: string) => {
    const ci = customImages.find(c => c.path === imageKey);
    if (ci) {
        ci.name = newName;
        store.set('customImages', customImages);
        rebuildMenu();
        sendPickerUpdate();
    }
});

// --- Tray menu ---

function periodMenuItem(label: string, interval: number): MenuItemConstructorOptions {
    return {
        label,
        type: 'radio',
        checked: currentInterval === interval,
        click: () => {
            setTracker(interval);
            rebuildMenu();
        },
    };
}

let tray: Tray;

function rebuildMenu() {
    const template: MenuItemConstructorOptions[] = [
        { label: s.interval, submenu: [
            periodMenuItem(s.sec10, 10000),
            periodMenuItem(s.min1, ONEMINUTE),
            periodMenuItem(s.min5, ONEMINUTE * 5),
            periodMenuItem(s.min10, ONEMINUTE * 10),
            periodMenuItem(s.min30, ONEMINUTE * 30),
            periodMenuItem(s.min45, ONEMINUTE * 45),
            periodMenuItem(s.hour1, ONEMINUTE * 60),
        ]},
        { label: s.image, submenu: [
            ...getAllImages().map((img): MenuItemConstructorOptions => ({
                label: img.label,
                type: 'radio',
                checked: currentImage === img.key,
                click: () => { setImage(img.key); },
            })),
            { type: 'separator' },
            { label: s.manageImages, click: () => { openPicker(); }},
        ]},
        { type: 'separator' },
        { label: s.fireNow, click: () => { popup(); }},
        { type: 'separator' },
        { label: s.quit, click: () => { app.quit(); }},
    ];

    tray.setContextMenu(Menu.buildFromTemplate(template));
}

// --- App lifecycle ---

app.whenReady().then(() => {
    if (app.dock) app.dock.hide();

    popupWin = new BrowserWindow({
        width: 256,
        height: 256,
        resizable: true,
        frame: false,
        backgroundColor: '#00FFFFFF',
        skipTaskbar: true,
        transparent: true,
        show: false,
        webPreferences: {
            contextIsolation: true,
            preload: path.join(__dirname, 'popup-preload.js'),
        },
    });

    loadImage();

    function getTrayIcon(): string {
        const variant = nativeTheme.shouldUseDarkColors ? 'light' : 'dark';
        return path.join(getAssetsDir(), `trayicon_${variant}.png`);
    }
    tray = new Tray(getTrayIcon());
    nativeTheme.on('updated', () => {
        tray.setImage(getTrayIcon());
    });

    rebuildMenu();
    setTracker(currentInterval);

    app.setLoginItemSettings({
        openAtLogin: true,
    });
});

app.on('window-all-closed', (e: Event) => {
    e.preventDefault();
});
