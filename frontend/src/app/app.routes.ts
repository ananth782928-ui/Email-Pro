import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { MainLayoutComponent } from './components/main-layout/main-layout.component';
import { EmailListComponent } from './components/email-list/email-list.component';
import { EmailDetailComponent } from './components/email-detail/email-detail.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'inbox',
        pathMatch: 'full'
      },
      {
        path: 'inbox',
        component: EmailListComponent,
        data: { folder: 'inbox' }
      },
      {
        path: 'sent',
        component: EmailListComponent,
        data: { folder: 'sent' }
      },
      {
        path: 'mail/:id',
        component: EmailDetailComponent
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'inbox'
  }
];
