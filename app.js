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
        icon: 'favicon.ico',
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
    mainWindow.setMinimumSize(750, 700);
    mainWindow.setTitle('TF2 Server Launcher');

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

/** 
 * Gets the download links from the SourceMod or Metamod:Source download pages.
 * The link to the ZIP download file must be passed as a parameter.
 * 
 * @param {string} url
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
 * Creates a file in the specified path.
 * @param {string} path - The path to the file.
 * @param {string} content - The content of the file.
*/
async function createFile(path, content) {
    return await new Promise((resolve, reject) => {
        fs.writeFile(path, content, (err) => {
            if (err) reject(err);
            resolve();
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
 * Deletes a folder recursively.
 * @param {string} path 
 * @returns 
 */
async function deleteFolderRecursively(path) {
    return await new Promise((resolve, reject) => {
        if (fs.existsSync(path)) {
            fs.rmdir(path, { recursive: true, force: true }, (err) => {
                if (err) reject(err);
                resolve();
            });
        }
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
    await createFolder(`${arg.savePath}\\config.json`, JSON.stringify(arg.config));
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