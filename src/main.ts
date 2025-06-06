import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));


