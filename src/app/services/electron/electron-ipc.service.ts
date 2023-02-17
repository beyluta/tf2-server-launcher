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

  createDirectory(opts: { savePath: string }) {
    this.electronService.ipcRenderer.send('create-default-server-path', opts);
    this.electronService.ipcRenderer.on('create-default-server-path-reply', (event, arg) => {
      if (arg === 'success') {
        console.log('Default server path created successfully');
      }
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

  startServer(opts: { savePath: string }) {
    this.electronService.ipcRenderer.send('run-server', opts);
    this.electronService.ipcRenderer.on('run-server-reply', (event, arg) => {
      if (arg === 'success') {
        console.log('Server started successfully');
      }
    });
  }
}
