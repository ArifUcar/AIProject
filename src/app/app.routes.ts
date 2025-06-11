import { Routes } from '@angular/router';
import { LoginPageComponent } from './Modules/Auth/login-page/login-page.component';
import { RegisterPageComponent } from './Modules/Auth/register-page/register-page.component';

import { AuthGuard } from './Core/Guards/auth.guard';
import { ChatComponent } from './Modules/User/chat-page/chat.component';
import { ChoosePlanComponent } from './Modules/User/choose-plan/choose-plan.component';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'chat',
        pathMatch: 'full'
    },
    {
        path: 'login',
        component: LoginPageComponent
    },
    {
        path: 'register',
        component: RegisterPageComponent
    },
    {
        path: 'chat',
        loadComponent: () => import('./Modules/User/chat-page/chat.component').then(m => m.ChatComponent),
        canActivate: [AuthGuard],
        title: 'Sohbet'
    },
    {
        path: 'choose-plan',
        component: ChoosePlanComponent,
        canActivate: [AuthGuard]
    },
    {
        path: '**',
        redirectTo: 'chat'
    }
];
