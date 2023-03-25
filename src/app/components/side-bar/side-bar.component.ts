import { Component, Output, EventEmitter, ViewChild } from '@angular/core';

@Component({
  selector: 'app-side-bar',
  templateUrl: './side-bar.component.html',
  styleUrls: ['./side-bar.component.css']
})
export class SideBarComponent {
  @Output() switchTab = new EventEmitter<string>();
  @ViewChild('optionsTab') optionsTabElement: any;
  @ViewChild('serversTab') serversTabElement: any;

  switch(tab: string) {
    this.setActive(tab);
    this.switchTab.emit(tab);
  }

  setActive(tab: string) {
    this.optionsTabElement.nativeElement.classList.remove('selected');
    this.serversTabElement.nativeElement.classList.remove('selected');

    switch (tab) {
      case 'options':
        this.optionsTabElement.nativeElement.classList.add('selected');
        break;

      case 'servers':
        this.serversTabElement.nativeElement.classList.add('selected');
        break;
    }
  }
}
