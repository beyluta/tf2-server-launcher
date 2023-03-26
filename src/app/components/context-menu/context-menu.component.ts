import { Component, Input } from '@angular/core';
import { faEllipsisV } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-context-menu',
  templateUrl: './context-menu.component.html',
  styleUrls: ['./context-menu.component.css']
})
export class ContextMenuComponent {
  @Input() items: any;
  public show: boolean = false;
  public icons = {
    faEllipsisV
  };

  toggle() {
    this.show = !this.show;
  }
}
