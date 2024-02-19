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

let tracker: NodeJS.Timeout | null = null;
let currentInterval: number = store.get('interval', ONEMINUTE * 5);

const createWindow = () => {
    const win = new BrowserWindow({
        width: 256,
        height: 256,
        resizable: true,
        frame: false,
        backgroundColor: '#00FFFFFF',
        transparent: true,
    });

    win.loadFile('public/index.html');

    function setTracker(interval: number) {
        store.set('interval', interval);
        currentInterval = interval;
        if(tracker) clearInterval(tracker);
        tracker = setInterval(() => {
            const pt = screen.getCursorScreenPoint();
            const [w, h] = win.getSize();
            win.setPosition(pt.x - w / 2, pt.y - h / 2, true);
            win.show();
        }, currentInterval);
    }
    setTracker(store.get('interval'));

    const tray = new Tray(app.isPackaged ? path.join(process.resourcesPath, '../assets/trayicon.png') : path.join(__dirname, '../assets/trayicon.png'));
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
            periodMenuItem(4, '1시간', ONEMINUTE * 60),
        ]},
        { label: '도움', type: 'normal', click: (menuItem, window, event) => {
          shell.openExternal('https://www.nhis.or.kr/magazin/mobile/201604/c07.html');
        }},
        { label: '닫기', role: 'quit', type: 'normal' },
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
