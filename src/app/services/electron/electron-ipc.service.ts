import { Injectable } from '@angular/core';
import { ElectronService } from 'ngx-electron';


@Injectable({
  providedIn: 'root'
})
export class ElectronIPCService {

  constructor(private electronService: ElectronService) { }

  async getDirectories(opts: { savePath: string }): Promise<[]> {
    this.electronService.ipcRenderer.send('get-directories', opts);
    return await new Promise((resolve, reject) => {
      this.electronService.ipcRenderer.on('get-directories-reply', (event, arg) => {
        console.log('Directories retrieved successfully');
        resolve(arg);
      });
    });
  }

  navigateToFolder(opts: { savePath: string }) {
    this.electronService.ipcRenderer.send('navigate-to-folder', opts);
  }

  async createDirectory(opts: { savePath: string, config?: {} }): Promise<void> {
    return await new Promise((resolve, reject) => {
      this.electronService.ipcRenderer.send('create-default-server-path', opts);
      this.electronService.ipcRenderer.on('create-default-server-path-reply', (event, arg) => {
        if (arg === 'success') {
          console.log('Default server path created successfully');
          resolve();
        }
      });
    });
  }

  async getConfigFile(opts: { savePath: string }): Promise<any> {
    this.electronService.ipcRenderer.send('get-config-file', opts);
    return await new Promise((resolve, reject) => {
      this.electronService.ipcRenderer.on('get-config-file-reply', (event, arg) => {
        console.log('Config file retrieved successfully');
        resolve(JSON.parse(arg));
      });
    });
  }

  async replaceConfigFile(opts: { savePath: string, config: {} }): Promise<void> {
    return await new Promise((resolve, reject) => {
      this.electronService.ipcRenderer.send('replace-config-file', opts);
      this.electronService.ipcRenderer.on('replace-config-file-reply', (event, arg) => {
        if (arg === 'success') {
          console.log('Config file replaced successfully');
          resolve();
        }
      });
    });
  }

  createDirectoryConfig(opts: { savePath: string, config: {} }) {
    this.electronService.ipcRenderer.send('create-directory-config', opts);
    this.electronService.ipcRenderer.on('create-directory-config-reply', (event, arg) => {
      if (arg === 'success') {
        console.log('Directory config created successfully');
      }
    });
  }

  async downloadFile(opts: { url: string, savePath: string }): Promise<string> {
    this.electronService.ipcRenderer.send('download-file', opts);
    return new Promise((resolve, reject) => {
      this.electronService.ipcRenderer.on('download-file-reply', (event, arg) => {
        if (arg === 'success') {
          console.log('File downloaded successfully');
          resolve('success');
        }
        reject();
      });
    });
  }

  async startServer(opts: { savePath: string }): Promise<any> {
    this.electronService.ipcRenderer.send('run-server', opts);
    return await new Promise((resolve, reject) => {
      this.electronService.ipcRenderer.on('run-server-reply', (event, arg) => {
        if (arg.status === 'success') {
          console.log('Server started successfully. PID: ' + arg.pid);
          resolve(Number(arg.pid));
        }
      });
    });
  }

  killServer(opts: { pid: number }) {
    this.electronService.ipcRenderer.send('kill-server', opts);
  }

  async downloadSourcemod(opts: { savePath: string, downloadLinkSM: string, downloadLinkMM: string }) {
    this.electronService.ipcRenderer.send('download-sourcemod', opts);
    return await new Promise((resolve, reject) => {
      this.electronService.ipcRenderer.on('download-sourcemod-reply', (event, arg) => {
        if (arg === 'success') {
          console.log('Sourcemod downloaded successfully');
          resolve('success');
        }
      });
    });
  }

  async deleteServerFiles(opts: { savePath: string }) {
    this.electronService.ipcRenderer.send('delete-server-files', opts);
    return await new Promise((resolve, reject) => {
      this.electronService.ipcRenderer.on('delete-server-files-reply', (event, arg) => {
        if (arg === 'success') {
          console.log('Server files deleted successfully');
          resolve('success');
        }
      });
    });
  }
}
