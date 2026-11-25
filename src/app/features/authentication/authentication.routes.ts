import { Routes } from '@angular/router';
import { forgotPasswordRoutes } from './forgot-password/forgot-password.routes';
import { loginRoutes } from './login/login.routes';
import { registerRoutes } from './register/register.routes';
import { verifyEmailRoutes } from './verify-email/verify-email.routes';

export const authenticationRoutes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  ...loginRoutes,
  ...registerRoutes,
  ...forgotPasswordRoutes,
  ...verifyEmailRoutes,
  { path: '**', redirectTo: 'login' },
];
