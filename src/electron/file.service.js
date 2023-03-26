const fs = require('fs');

/** 
 * Creates a file in the specified path.
 * @param {string} path The path to the file.
 * @param {string} content The content of the file.
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
 * @param {string} path Path to the folder.
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
 * @param {string} rootDir1 Directory to be merged. Will be merged into rootDir2.
 * @param {string} rootDir2 Directory to be merged.
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
 * Deletes a folder recursively.
 * @param {string} path Path to the folder.
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

module.exports = {
    createFile,
    createFolder,
    deepMergeDir,
    deleteFolderRecursively
};