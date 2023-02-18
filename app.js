const { app, BrowserWindow, ipcMain } = require('electron');
var child = require('child-process-promise');
const { spawn, exec } = require('child_process');
const url = require("url");
const path = require("path");
const http = require('http');
const fs = require('fs');
const AdmZip = require("adm-zip");

let mainWindow

function createWindow() {
    mainWindow = new BrowserWindow({
        icon: 'src/assets/imgs/Icon.png',
        width: 750,
        height: 700,
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true
        }
    })

    mainWindow.loadURL(
        url.format({
            pathname: path.join(__dirname, `/dist/tf2-server-manager/index.html`),
            protocol: "file:",
            slashes: true
        })
    );

    // mainWindow.webContents.openDevTools();
    mainWindow.setMenu(null);
    mainWindow.setMinimumSize(700, 700);

    mainWindow.on('closed', function () {
        mainWindow = null
    })
}

app.on('ready', createWindow)

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
    if (mainWindow === null) createWindow()
})

/* ------------------ IPC ------------------ */
ipcMain.on('navigate-to-folder', async (event, arg) => {
    exec(`start "" "${arg.savePath}"`);
});

ipcMain.on('create-default-server-path', async (event, arg) => {
    await new Promise((resolve, reject) => {
        if (!fs.existsSync(arg.savePath)) {
            fs.mkdirSync(arg.savePath);
            resolve();
        }
        reject();
    });
});

ipcMain.on('create-server-directory', async (event, arg) => {
    await new Promise((resolve, reject) => {
        if (!fs.existsSync(arg.savePath)) {
            fs.mkdirSync(arg.savePath);
            resolve();
        }
        reject();
    });
});

ipcMain.on('create-directory-config', async (event, arg) => {
    await new Promise((resolve, reject) => {
        fs.writeFile(`${arg.savePath}\\config.json`, JSON.stringify(arg.config), (err) => {
            if (err) reject(err);

            resolve();
        });
    });

    event.reply('create-directory-config-reply', 'success');
});

ipcMain.on('get-directories', async (event, arg) => {
    const directories = fs.readdirSync(arg.savePath);
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

        await new Promise((resolve, reject) => {
            fs.writeFile(arg.savePath.replace('steamcmd.zip', 'tf2_ds.txt'), `
        @ShutdownOnFailedCommand 1
        @NoPromptForPassword 1
        force_install_dir ${arg.savePath.replace('steamcmd.zip', '')}
        login anonymous
        app_update 232250
        quit
        `, (err) => {
                if (err) reject(err);

                resolve();
            });
        });

        await new Promise((resolve, reject) => {
            fs.writeFile(arg.savePath.replace('steamcmd.zip', 'run.bat'), `
            @echo off
            steamcmd.exe +runscript tf2_ds.txt
            `, (err) => {
                if (err) reject(err);

                resolve();
            });
        });

        await update();

        await new Promise((resolve, reject) => {
            fs.writeFile(arg.savePath.replace('steamcmd.zip', 'steamapps\\common\\Team Fortress 2 Dedicated Server\\run.bat'), `
            @echo off
            "${arg.savePath.replace('steamcmd.zip', 'steamapps\\common\\Team Fortress 2 Dedicated Server\\srcds.exe')}" ${config.args} ${config.ip ? '-ip ' + config.ip : ''} ${config.port ? '-port ' + config.port : ''}
            `, (err) => {
                if (err) reject(err);

                resolve();
            });
        });

        await new Promise((resolve, reject) => {
            fs.writeFile(arg.savePath.replace('steamcmd.zip', 'steamapps\\common\\Team Fortress 2 Dedicated Server\\tf\\cfg\\server.cfg'), `
            ${config.serverName ? 'hostname "' + config.serverName + '"' : ''}
            ${config.serverPassword ? 'sv_password "' + config.serverPassword + '"' : ''}
            ${config.configArgs ? config.configArgs : ''}
            `.trim(), (err) => {
                if (err) reject(err);

                resolve();
            });
        });
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
/* ------------------ IPC ------------------ */