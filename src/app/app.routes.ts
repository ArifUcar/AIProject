import { Routes } from '@angular/router';
import { LoginPageComponent } from './Modules/Auth/login-page/login-page.component';
import { RegisterPageComponent } from './Modules/Auth/register-page/register-page.component';
import { ChatPageComponent } from './Modules/User/chat-page/chat-page.component';
import { AuthGuard } from './Core/Guards/auth.guard';
import { ChoosePlanPageComponent } from './Modules/User/choose-plan-page/choose-plan-page.component';

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
        path: 'choose-plan',
        component: ChoosePlanPageComponent,
        canActivate: [AuthGuard]
    },
    {
        path: '**',
        redirectTo: 'login'
    }
];
