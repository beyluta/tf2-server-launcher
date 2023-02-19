import { Component, OnInit, AfterViewInit } from '@angular/core';
import { ElectronIPCService } from './services/electron/electron-ipc.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  private steamCMDDownloadURL: string = 'http://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip';
  private defaultGameServersPath: string = 'C:\\TFGameServers';
  public activeGameServerPIDs: Map<string, number> = new Map();
  public gameServers: [] = [];
  public showCreateServerModal: boolean = false;
  public showLoaderModal: boolean = false;
  public showSourcemodLoaderModal: boolean = false;

  constructor(private electronIPCService: ElectronIPCService) { }

  ngOnInit() {
    this.electronIPCService.createDirectory({ savePath: this.defaultGameServersPath });
  }

  ngAfterViewInit() {
    var initialGameServers = setInterval(async () => {
      await this.loadGameServers();
      if (this.gameServers.length) {
        clearInterval(initialGameServers);
      }
    }, 1000);
  }

  createServerDirectory() {
    this.electronIPCService.createDirectory({
      savePath: `${this.defaultGameServersPath}`
    });
  }

  async createDirModalEvent(event: any) {
    if (event === 'close') {
      this.showCreateServerModal = false;
    }

    this.loadGameServers();
  }

  async loadGameServers() {
    this.gameServers = await this.electronIPCService.getDirectories({
      savePath: this.defaultGameServersPath
    });
  }

  navigateToFolder(path: string) {
    this.electronIPCService.navigateToFolder({ savePath: `${this.defaultGameServersPath}\\${path}` });
  }

  createGameServer() {
    this.showCreateServerModal = !this.showCreateServerModal;
  }

  async downloadFile(serverName: string) {
    this.showLoaderModal = true;
    await this.electronIPCService.downloadFile({
      url: this.steamCMDDownloadURL,
      savePath: `${this.defaultGameServersPath}\\${serverName}\\steamcmd.zip`
    });
    this.showLoaderModal = false;
  }

  async downloadSourcemod(serverName: string) {
    this.showSourcemodLoaderModal = true;
    await this.electronIPCService.downloadSourcemod({
      savePath: `${this.defaultGameServersPath}\\${serverName}`
    });
    this.showSourcemodLoaderModal = false;
  }

  async startServer(serverName: string) {
    if (!this.activeGameServerPIDs.has(serverName)) {
      const pid = await this.electronIPCService.startServer({
        savePath: `${this.defaultGameServersPath}\\${serverName}\\steamcmd.zip`
      });

      this.activeGameServerPIDs.set(serverName, pid);
    } else {
      this.electronIPCService.killServer({ pid: Number(this.activeGameServerPIDs.get(serverName)) });

      this.activeGameServerPIDs.delete(serverName);
    }
  }
}
