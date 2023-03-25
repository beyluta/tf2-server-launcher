import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { NgxElectronModule } from 'ngx-electron';

import { AppComponent } from './app.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ServerFormComponent } from './components/server-form/server-form.component';
import { LoaderComponent } from './components/loader/loader.component';
import { SideBarComponent } from './components/side-bar/side-bar.component';
import { ContextMenuComponent } from './components/context-menu/context-menu.component';

@NgModule({
  declarations: [
    AppComponent,
    ServerFormComponent,
    LoaderComponent,
    SideBarComponent,
    ContextMenuComponent
  ],
  imports: [
    BrowserModule,
    NgxElectronModule,
    FormsModule,
    FontAwesomeModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
