const request = require('request');
const cheerio = require('cheerio');
const fs = require('fs');
const https = require('https');
const AdmZip = require("adm-zip");

/** 
 * Gets the download links from the SourceMod or Metamod:Source download pages.
 * The link to the ZIP download file must be passed as a parameter.
 * 
 * @param {string} url URL to either the SourceMod or Metamod:Source download page.
*/
async function getDownloadLinks(url) {
    return await new Promise((resolve, reject) => {
        request(url, (error, response, body) => {
            if (error) reject(error);
            const $ = cheerio.load(body);
            const links = $('.download-link[title="Windows download"]').map((i, el) => $(el).attr('href')).get();
            resolve(links);
        });
    });
}

/** 
 * Downloads a ZIP file from a URL and saves it to a path.
 * 
 * @param {string} name Name of the ZIP file.
 * @param {string} url URL to the ZIP file.
 * @param {string} path Path to save the ZIP file.
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

module.exports = {
    getDownloadLinks,
    downloadZIPFileByURL
};