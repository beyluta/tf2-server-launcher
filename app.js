const { app, BrowserWindow, ipcMain } = require('electron');
const request = require('request');
const cheerio = require('cheerio');
const child = require('child-process-promise');
const { spawn, exec } = require('child_process');
const url = require("url");
const path = require("path");
const http = require('http');
const https = require('https');
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

/** 
 * Gets the download links from the SourceMod or Metamod:Source download pages.
 * The link to the ZIP download file must be passed as a parameter.
 * 
 * @param {string} path
*/
async function getDownloadLinks(url) {
    return await new Promise((resolve, reject) => {
        request(url, (error, response, body) => {
            if (error) reject(error);

            const $ = cheerio.load(body);
            const links = $('.quick-download').map((i, link) => $(link).attr('href')).get();

            resolve(links);
        });
    });
}

/** 
 * Creates a folder in the specified path.
 * 
 * @param {string} path
*/
async function createFolder(path) {
    return await new Promise((resolve, reject) => {
        fs.mkdir(path, (err) => {
            if (err) reject(err);

            resolve();
        });
    });
}

/** 
 * Merges two directories recursively.
 * 
 * @param {string} rootDir1
 * @param {string} rootDir2
*/
function deepMergeDir(rootDir1, rootDir2) {
    const files1 = fs.readdirSync(rootDir1);
    const files2 = fs.readdirSync(rootDir2);

    for (let i = 0; i < files1.length; i++) {
        for (let j = 0; j < files2.length; j++) {
            if (files1[i] === files2[j]) {
                deepMergeDir(`${rootDir1}\\${files1[i]}`, `${rootDir2}\\${files2[j]}`);
            }
        }
    }

    for (let i = 0; i < files1.length; i++) {
        if (!files2.includes(files1[i])) {
            fs.renameSync(`${rootDir1}\\${files1[i]}`, `${rootDir2}\\${files1[i]}`);
        }
    }

    fs.rmdirSync(rootDir1);
}

/** 
 * Downloads a ZIP file from a URL and saves it to a path.
 * 
 * @param {string} name
 * @param {string} url
 * @param {string} path
*/
async function downloadZIPFileByURL(name, url, path) {
    const file = fs.createWriteStream(name);
    const request = https.get(url, function (response) {
        response.pipe(file);
    });

    await new Promise((resolve, reject) => {
        file.on('finish', resolve);
        file.on('error', reject);
    });

    await new Promise((resolve, reject) => {
        fs.rename(name, `${path}\\${name}`, (err) => {
            if (err) reject(err);
            resolve();
        });
    });

    await new Promise(resolve => {
        const zip = new AdmZip(`${path}\\${name}`);
        zip.extractAllTo(path, true);
        resolve();
    });

    await new Promise((resolve, reject) => {
        fs.unlink(`${path}\\${name}`, (err) => {
            if (err) reject(err);
            resolve();
        });
    });
}

app.on('ready', createWindow);

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
    await createFolder(arg.savePath);
});

ipcMain.on('create-server-directory', async (event, arg) => {
    await createFolder(arg.savePath);
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

ipcMain.on('download-sourcemod', async (event, arg) => {
    if (!fs.existsSync(`${arg.savePath}\\steamapps\\common\\Team Fortress 2 Dedicated Server\\tf\\addons`)) {
        const sourcemodLinks = await getDownloadLinks('https://www.sourcemod.net/downloads.php?branch=stable');
        const metamodLinks = await getDownloadLinks('https://www.sourcemm.net/downloads.php?branch=stable');
        await createFolder(`${arg.savePath}\\sourcemod`);
        await createFolder(`${arg.savePath}\\metamod`);
        await downloadZIPFileByURL('sourcemod.zip', sourcemodLinks[0], `${arg.savePath}\\sourcemod`);
        await downloadZIPFileByURL('metamod.zip', metamodLinks[0], `${arg.savePath}\\metamod`);
        deepMergeDir(`${arg.savePath}\\metamod`, `${arg.savePath}\\sourcemod`);
        deepMergeDir(`${arg.savePath}\\sourcemod`, `${arg.savePath}\\steamapps\\common\\Team Fortress 2 Dedicated Server\\tf`);
    }

    event.reply('download-sourcemod-reply', 'success');
});
/* ------------------ IPC ------------------ */