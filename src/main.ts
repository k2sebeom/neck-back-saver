import { app, BrowserWindow, Menu, screen } from 'electron';
import Store, { Schema } from 'electron-store';

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

let tracker: NodeJS.Timeout | null = null;

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

    const menu = Menu.buildFromTemplate([
        {
            label: 'Settings',
            click: () => {
                
            },
        }
    ]);
    Menu.setApplicationMenu(menu);

    const interval = store.get('interval');

    tracker = setInterval(() => {
        const pt = screen.getCursorScreenPoint();
        const [w, h] = win.getSize();
        win.setPosition(pt.x - w / 2, pt.y - h / 2, true);
    }, interval);
}

app.whenReady().then(() => {
    createWindow();
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})