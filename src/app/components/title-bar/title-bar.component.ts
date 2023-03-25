import { Component } from '@angular/core';
import { faClose, faMaximize, faWindowMinimize } from '@fortawesome/free-solid-svg-icons';
import { ElectronIPCService } from 'src/app/services/electron/electron-ipc.service';

@Component({
  selector: 'app-title-bar',
  templateUrl: './title-bar.component.html',
  styleUrls: ['./title-bar.component.css']
})
export class TitleBarComponent {
  public icons = {
    faClose,
    faMaximize,
    faWindowMinimize
  };

  constructor(private electronIPCService: ElectronIPCService) { }

  closeWindow(): void {    
    this.electronIPCService.closeWindow();
  }

  minimizeWindow(): void {
    this.electronIPCService.minimizeWindow();
  }
}
