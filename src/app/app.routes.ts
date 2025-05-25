import { Routes } from '@angular/router';
import { LoginPageComponent } from './Modules/Auth/login-page/login-page.component';
import { RegisterPageComponent } from './Modules/Auth/register-page/register-page.component';
import { ChatPageComponent } from './Modules/User/chat-page/chat-page.component';
import { AuthGuard } from './Core/Guards/auth.guard';

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
        component: ChatPageComponent,
        canActivate: [AuthGuard]
    },
    {
        path: '**',
        redirectTo: 'login'
    }
];
