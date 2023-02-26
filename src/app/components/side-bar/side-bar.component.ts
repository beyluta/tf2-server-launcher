import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-side-bar',
  templateUrl: './side-bar.component.html',
  styleUrls: ['./side-bar.component.css']
})
export class SideBarComponent {
  @Output() switchTab = new EventEmitter<string>();

  switch(tab: string) {
    this.switchTab.emit(tab);
  }
}
