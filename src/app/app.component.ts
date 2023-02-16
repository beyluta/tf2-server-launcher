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
  public gameServers: [] = [];
  public showCreateServerModal: boolean = false;
  public showLoaderModal: boolean = false;
  public loaderContext: string;
  public loaderDescription: string;

  constructor(private electronIPCService: ElectronIPCService) { }

  ngOnInit() {
    this.loaderContext = 'Downloading or updating your game server';
    this.loaderDescription = 'Downloading can take a while, please be patient. This may take up to an hour.';
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

  startServer(serverName: string) {
    this.electronIPCService.startServer({
      savePath: `${this.defaultGameServersPath}\\${serverName}\\steamcmd.zip`
    });
  }
}