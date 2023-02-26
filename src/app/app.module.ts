import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { NgxElectronModule } from 'ngx-electron';

import { AppComponent } from './app.component';
import { ServerFormComponent } from './components/server-form/server-form.component';
import { LoaderComponent } from './components/loader/loader.component';
import { SideBarComponent } from './components/side-bar/side-bar.component';

@NgModule({
  declarations: [
    AppComponent,
    ServerFormComponent,
    LoaderComponent,
    SideBarComponent
  ],
  imports: [
    BrowserModule,
    NgxElectronModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
