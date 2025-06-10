import { Routes } from '@angular/router';
import { LoginPageComponent } from './Modules/Auth/login-page/login-page.component';
import { RegisterPageComponent } from './Modules/Auth/register-page/register-page.component';

import { AuthGuard } from './Core/Guards/auth.guard';
import { ChatComponent } from './Modules/User/chat-page/chat.component';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'login',
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
        component: ChatComponent,
        canActivate: [AuthGuard]
    },
    {
        path: '**',
        redirectTo: 'login'
    }
];
