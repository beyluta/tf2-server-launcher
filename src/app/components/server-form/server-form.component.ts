import { Component, EventEmitter, Output } from '@angular/core';
import { ElectronIPCService } from '../../services/electron/electron-ipc.service';

@Component({
  selector: 'app-server-form',
  templateUrl: './server-form.component.html',
  styleUrls: ['./server-form.component.css']
})
export class ServerFormComponent {
  public serverName: string;
  public serverPassword: string;
  public ip: string;
  public port: string;
  public args: string = "-console -game tf +sv_pure 1 +randommap +maxplayers 24";
  public configArgs: string;

  constructor(private electronIPCService: ElectronIPCService) { }

  @Output() modalClose = new EventEmitter<string>();

  trimAll(str: string) {
    return str.replace(/\s/g, '');
  }

  createDirectory() {
    const savePath = `C:\\TFGameServers\\${this.trimAll(this.serverName)}`;

    this.electronIPCService.createDirectory({
      savePath: savePath
    });

    this.electronIPCService.createDirectoryConfig({
      savePath: savePath,
      config: {
        serverName: this.serverName,
        serverPassword: this.serverPassword,
        ip: this.ip,
        port: this.port,
        args: this.args,
        configArgs: this.configArgs
      }
    });

    this.modalClose.emit('close');
  }

  cancel() {
    this.modalClose.emit('close');
  }
}
