import { Component, OnInit, AfterViewInit } from '@angular/core';
import { ElectronIPCService } from './services/electron/electron-ipc.service';
import { faDownload, faPlay, faStop } from '@fortawesome/free-solid-svg-icons';
import { GameServer } from './templates/server.template';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  public steamCMDDownloadURL: string = 'http://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip';
  public sourceModDownloadURL: string = 'https://www.sourcemod.net/downloads.php?branch=stable';
  public metaModDownloadURL: string = 'https://www.sourcemm.net/downloads.php?branch=stable';
  public defaultGameServersPath: string = 'C:\\TFGameServers';
  public activeTab: string = 'servers';
  public activeGameServerPIDs: Map<string, number> = new Map();
  public gameServerInformation: GameServer[] = [];
  public showCreateServerModal: boolean = false;
  public showLoaderModal: boolean = false;
  public showSourcemodLoaderModal: boolean = false;
  public showDefaultLoader: boolean = false;
  public icons = {
    faDownload,
    faPlay,
    faStop
  };

  constructor(private electronIPCService: ElectronIPCService) { }

  async ngOnInit() {
    await this.electronIPCService.createDirectory({
      savePath: this.defaultGameServersPath,
      config: {
        defaultServerPath: this.defaultGameServersPath,
        steamCMDDownloadURL: this.steamCMDDownloadURL,
        sourceModDownloadURL: this.sourceModDownloadURL,
        metaModDownloadURL: this.metaModDownloadURL
      }
    });
    const config = await this.electronIPCService.getConfigFile({ savePath: this.defaultGameServersPath });
    this.steamCMDDownloadURL = config.steamCMDDownloadURL;
    this.sourceModDownloadURL = config.sourceModDownloadURL;
    this.metaModDownloadURL = config.metaModDownloadURL;
  }

  tab(tabName: string) {
    this.activeTab = tabName;
  }

  ngAfterViewInit() {
    var initialGameServers = setInterval(async () => {
      await this.loadGameServers();
      if (this.gameServerInformation.length) {
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
    this.gameServerInformation = (await this.electronIPCService.getDirectories({
      savePath: this.defaultGameServersPath
    })).map((serverName: any) => {
      const server = new GameServer();
      server.name = serverName;
      server.playerCount = 0;
      return server;
    });      
  }

  async updateServerInformation() {

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
      savePath: `${this.defaultGameServersPath}\\${serverName}`,
      downloadLinkSM: this.sourceModDownloadURL,
      downloadLinkMM: this.metaModDownloadURL
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

  async deleteServerFiles(serverName: string) {
    this.showDefaultLoader = true;
    await this.electronIPCService.deleteServerFiles({
      savePath: `${this.defaultGameServersPath}\\${serverName}`
    });
    this.showDefaultLoader = false;
  }

  async updateConfig() {
    this.showLoaderModal = true;
    const config = {
      defaultServerPath: this.defaultGameServersPath,
      steamCMDDownloadURL: this.steamCMDDownloadURL,
      sourceModDownloadURL: this.sourceModDownloadURL,
      metaModDownloadURL: this.metaModDownloadURL
    };
    await this.electronIPCService.replaceConfigFile({ savePath: this.defaultGameServersPath, config });
    this.showLoaderModal = false;
  }

  createContextMenuItems(name: string) {
    return [{
      name: 'Get SourceMod',
      action: () => this.downloadSourcemod(name)
    }, {
      name: 'Open Folder',
      action: () => this.navigateToFolder(name)
    }, {
      name: 'Delete',
      action: () => this.deleteServerFiles(name)
    }]
  }
}
