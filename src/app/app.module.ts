import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { NgxElectronModule } from 'ngx-electron';

import { AppComponent } from './app.component';
import { ServerFormComponent } from './components/server-form/server-form.component';
import { LoaderComponent } from './components/loader/loader.component';

@NgModule({
  declarations: [
    AppComponent,
    ServerFormComponent,
    LoaderComponent
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
