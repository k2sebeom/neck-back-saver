import { app, BrowserWindow, Menu, MenuItemConstructorOptions, screen, shell, Tray } from 'electron';
import Store, { Schema } from 'electron-store';
import path from 'path';

interface Config {
    interval: number;
}
const schema: Schema<Config> = {
	interval: {
		type: 'number',
		default: 60000,
	},
};
const store = new Store({ schema });

const ONEMINUTE: number = 60000;
const BLINK_MAX: number = 30;

let tracker: NodeJS.Timeout | null = null;
let currentInterval: number = store.get('interval', ONEMINUTE * 5);

const createWindow = () => {
    const win = new BrowserWindow({
        width: 256,
        height: 256,
        resizable: true,
        frame: false,
        backgroundColor: '#00FFFFFF',
        skipTaskbar: true,
        transparent: true,
    });

    win.loadFile('public/index.html');

    function goCrazy(count: number = 0) {
        const allDisplays = screen.getAllDisplays();

        const display = allDisplays[Math.floor(Math.random() * allDisplays.length)]
        const { width, height } = display.workAreaSize;

        const w = Math.floor(Math.random() * width);
        const h = Math.floor(Math.random() * height);
        win.setPosition(w, h, false);
        win.show();
        win.focus();
        
        if(count < BLINK_MAX) {
            setTimeout(() => goCrazy(count + 1), 300);
        } else {
            const pt = screen.getCursorScreenPoint();
            const center = [pt.x - win.getSize()[0] / 2, pt.y - win.getSize()[1] / 2]
            win.setPosition(Math.floor(center[0]), Math.floor(center[1]), false);
            win.show();
            win.focus();
        }
    }

    function setTracker(interval: number) {
        store.set('interval', interval);
        currentInterval = interval;
        if(tracker) clearInterval(tracker);
        tracker = setInterval(goCrazy, currentInterval);
    }
    setTracker(currentInterval);

    const tray = new Tray(app.isPackaged ? path.join(process.resourcesPath, 'assets', 'trayicon.png') : path.join(__dirname, '../assets/trayicon.png'));
    function periodMenuItem(i: number, label: string, interval: number): MenuItemConstructorOptions {
        return {
            label,
            type: 'radio',
            checked: currentInterval === interval,
            click: () => {
                setTracker(interval);
            },
        };
    }
    const contextMenu = Menu.buildFromTemplate([
        { label: '주기', submenu: [
            periodMenuItem(0, '10초', 10000),
            periodMenuItem(0, '1분', ONEMINUTE),
            periodMenuItem(1, '5분', ONEMINUTE * 5),
            periodMenuItem(2, '10분', ONEMINUTE * 10),
            periodMenuItem(3, '30분', ONEMINUTE * 30),
            periodMenuItem(3, '45분', ONEMINUTE * 45),
            periodMenuItem(4, '1시간', ONEMINUTE * 60),
        ]},
        { label: '발사', type: 'normal', click: (menuItem, window, event) => {
            goCrazy();
        }},
      ])
    tray.setContextMenu(contextMenu);
}

app.whenReady().then(() => {
    createWindow();
    app.setLoginItemSettings({
        openAtLogin: true,
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})
