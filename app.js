const { app, BrowserWindow, ipcMain } = require('electron');
const child = require('child-process-promise');
const { spawn, exec } = require('child_process');
const url = require("url");
const path = require("path");
const http = require('http');
const fs = require('fs');
const AdmZip = require("adm-zip");
const {
    createFile,
    createFolder,
    deepMergeDir,
    deleteFolderRecursively
} = require('./src/electron/file.service.js');
const {
    getDownloadLinks,
    downloadZIPFileByURL
} = require('./src/electron/remote-downloader.service.js');

let MAINWINDOW;
const DEFAULT_WINDOW_WIDTH = 750;
const DEFAULT_WINDOW_HEIGHT = 700;

function createWindow() {
    MAINWINDOW = new BrowserWindow({
        icon: 'favicon.ico',
        width: DEFAULT_WINDOW_WIDTH,
        height: DEFAULT_WINDOW_HEIGHT,
        frame: false,
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true
        }
    })

    MAINWINDOW.loadURL(
        url.format({
            pathname: path.join(__dirname, `/dist/tf2-server-manager/index.html`),
            protocol: "file:",
            slashes: true
        })
    );

    MAINWINDOW.webContents.openDevTools();
    MAINWINDOW.setMenu(null);
    MAINWINDOW.setMinimumSize(DEFAULT_WINDOW_WIDTH, DEFAULT_WINDOW_HEIGHT);
    MAINWINDOW.setTitle('TF2 Server Launcher');

    MAINWINDOW.on('closed', function () {
        MAINWINDOW = null;
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
    if (MAINWINDOW === null) createWindow()
})

/* ------------------ IPC ------------------ */
ipcMain.on('close-window', async (event, arg) => {
    MAINWINDOW.close();
});

ipcMain.on('minimize-window', async (event, arg) => {
    MAINWINDOW.minimize();
});

ipcMain.on('navigate-to-folder', async (event, arg) => {
    exec(`start "" "${arg.savePath}"`);
});

ipcMain.on('create-default-server-path', async (event, arg) => {
    if (!fs.existsSync(arg.savePath)) {
        await createFolder(arg.savePath);
    }

    if (!fs.existsSync(`${arg.savePath}\\config.json`)) {
        await createFile(`${arg.savePath}\\config.json`, JSON.stringify(arg.config));
    }

    event.reply('create-default-server-path-reply', 'success');
});

ipcMain.on('create-server-directory', async (event, arg) => {
    await createFolder(arg.savePath);
});

ipcMain.on('create-directory-config', async (event, arg) => {
    await createFile(`${arg.savePath}\\config.json`, JSON.stringify(arg.config));
    event.reply('create-directory-config-reply', 'success');
});

ipcMain.on('get-directories', async (event, arg) => {
    const directories = fs.readdirSync(arg.savePath).filter(dir => fs.lstatSync(`${arg.savePath}\\${dir}`).isDirectory());
    event.reply('get-directories-reply', directories);
});

ipcMain.on('download-file', async (event, arg) => {
    const config = JSON.parse(fs.readFileSync(arg.savePath.replace('steamcmd.zip', 'config.json'), 'utf8'));

    /**
     * Thanks to https://github.com/mathphreak/node-steamcmd/blob/master/index.js#L68
     * for the following implementation.
     */
    const update = async () => {
        return await new Promise((resolve, reject) => {
            child.spawn(arg.savePath.replace('steamcmd.zip', 'run.bat'),
                [],
                {
                    capture: ['stdout', 'stderr'],
                    cwd: arg.savePath.replace('steamcmd.zip', '')
                }
            ).then(function (x) {
                resolve(x)
            }).fail(function (x) {
                // For some reason, steamcmd will occasionally exit with code 7 and be fine.
                // This usually happens the first time touch() is called after download().
                if (x.code === 7) {
                    resolve(x)
                } else {
                    reject(x)
                }
            })
        });
    }

    if (!fs.existsSync(arg.savePath.replace('steamcmd.zip', '\\steamapps'))) {
        const file = fs.createWriteStream("steamcmd.zip");
        const request = http.get(arg.url, function (response) {
            response.pipe(file);
        });

        await new Promise((resolve, reject) => {
            file.on('finish', resolve);
            file.on('error', reject);
        });

        await new Promise((resolve, reject) => {
            fs.rename('steamcmd.zip', arg.savePath, (err) => {
                if (err) reject(err);
                resolve();
            });
        });

        await new Promise(resolve => {
            const zip = new AdmZip(arg.savePath);
            zip.extractAllTo(arg.savePath.replace('steamcmd.zip', ''), true);
            resolve();
        });

        /**
         * Thanks to https://github.com/mathphreak/node-steamcmd/blob/master/index.js#L68
         * for the following implementation.
         */
        const args = [].concat('quit').map(function (x) {
            return '+' + x
        }).join(' ').split(' ');
        await new Promise(function (resolve, reject) {
            child.spawn(arg.savePath.replace('steamcmd.zip', 'steamcmd.exe'),
                args,
                {
                    capture: ['stdout', 'stderr'],
                    cwd: arg.savePath.replace('steamcmd.zip', '')
                }
            ).then(function (x) {
                resolve(x)
            }).fail(function (x) {
                // For some reason, steamcmd will occasionally exit with code 7 and be fine.
                // This usually happens the first time touch() is called after download().
                if (x.code === 7) {
                    resolve(x)
                } else {
                    reject(x)
                }
            })
        });

        await createFile(arg.savePath.replace('steamcmd.zip', 'tf2_ds.txt'), `
        @ShutdownOnFailedCommand 1
        @NoPromptForPassword 1
        force_install_dir ${arg.savePath.replace('steamcmd.zip', '')}
        login anonymous
        app_update 232250
        quit
        `);

        await createFile(arg.savePath.replace('steamcmd.zip', 'run.bat'), `
        @echo off
        steamcmd.exe +runscript tf2_ds.txt
        `);

        await update();

        await createFile(arg.savePath.replace('steamcmd.zip', 'steamapps\\common\\Team Fortress 2 Dedicated Server\\run.bat'), `
        @echo off
        "${arg.savePath.replace('steamcmd.zip', 'steamapps\\common\\Team Fortress 2 Dedicated Server\\srcds.exe')}" ${config.args} ${config.ip ? '-ip ' + config.ip : ''} ${config.port ? '-port ' + config.port : ''}
        `);

        await createFile(arg.savePath.replace('steamcmd.zip', 'steamapps\\common\\Team Fortress 2 Dedicated Server\\tf\\cfg\\server.cfg'), `
        ${config.serverName ? 'hostname "' + config.serverName + '"' : ''}
        ${config.serverPassword ? 'sv_password "' + config.serverPassword + '"' : ''}
        ${config.configArgs ? config.configArgs : ''}
        `.trim());
    } else {
        await update();
    }

    event.reply('download-file-reply', 'success');
});

ipcMain.on('run-server', async (event, arg) => {
    const config = JSON.parse(fs.readFileSync(arg.savePath.replace('steamcmd.zip', 'config.json'), 'utf8'));

    const child = spawn(arg.savePath.replace('steamcmd.zip', `\"steamapps\\common\\Team Fortress 2 Dedicated Server\\srcds.exe\" ${config.args} ${config.ip ? '-ip ' + config.ip : ''} ${config.port ? '-port ' + config.port : ''}`), {
        shell: true,
        detached: true,
        stdio: ['ignore', 'ignore', 'ignore'],
    });

    child.unref();

    event.reply('run-server-reply', {
        status: 'success',
        pid: child.pid
    });
});

ipcMain.on('kill-server', async (event, arg) => {
    spawn("taskkill", ["/pid", arg.pid, '/f', '/t']);
});

ipcMain.on('download-sourcemod', async (event, arg) => {
    const pathToTFFolder = `${arg.savePath}\\steamapps\\common\\Team Fortress 2 Dedicated Server\\tf`;
    if (fs.existsSync(pathToTFFolder) && !fs.existsSync(`${pathToTFFolder}\\addons`)) {
        const sourcemodLinks = await getDownloadLinks(arg.downloadLinkSM);
        const metamodLinks = await getDownloadLinks(arg.downloadLinkMM);
        await createFolder(`${arg.savePath}\\sourcemod`);
        await createFolder(`${arg.savePath}\\metamod`);
        await downloadZIPFileByURL('sourcemod.zip', sourcemodLinks[0], `${arg.savePath}\\sourcemod`);
        await downloadZIPFileByURL('metamod.zip', metamodLinks[0], `${arg.savePath}\\metamod`);
        deepMergeDir(`${arg.savePath}\\metamod`, `${arg.savePath}\\sourcemod`);
        deepMergeDir(`${arg.savePath}\\sourcemod`, pathToTFFolder);
    }

    event.reply('download-sourcemod-reply', 'success');
});

ipcMain.on('delete-server-files', async (event, arg) => {
    await deleteFolderRecursively(arg.savePath).catch((err) => {
        console.error(err);
    });
    event.reply('delete-server-files-reply', 'success');
});

ipcMain.on('get-config-file', async (event, arg) => {
    const data = await new Promise((resolve, reject) => {
        if (fs.existsSync(`${arg.savePath}/config.json`)) {
            fs.readFile(`${arg.savePath}/config.json`, 'utf8', (err, data) => {
                if (err) reject(err);
                resolve(data);
            });
        }
    });

    event.reply('get-config-file-reply', data);
});

ipcMain.on('replace-config-file', async (event, arg) => {
    await createFile(`${arg.savePath}/config.json`, JSON.stringify(arg.config));
    event.reply('replace-config-file-reply', 'success');
});
/* ------------------ IPC ------------------ */