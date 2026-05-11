import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';

import { LoginComponent } from './components/login/login.component';

import { BookCaptureComponent } from './components/book-capture/book-capture.component';
import { BookDetailComponent } from './components/book-detail/book-detail.component';
import { BooksPageComponent } from './components/books-page/books-page.component';

import { BatchesPageComponent } from './components/batches-page/batches-page.component';
import { ForbiddenComponent } from './components/forbidden/forbidden.component';
import { ProtectedLayoutComponent } from './components/layout/protected-layout/protected-layout.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { UsersPageComponent } from './components/users-page/users-page.component';
import { adminGuard } from './guards/admin.guard';
import { batchPermissionGuard } from './guards/batch-permission.guard';
import { captureExitGuard } from './guards/capture-exit.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'batches', pathMatch: 'full' },

  // public
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },

  {
    path: 'forbidden',
    component: ForbiddenComponent,
    canActivate: [authGuard],
  },
  {
    path: 'not-found',
    component: NotFoundComponent,
    canActivate: [authGuard],
  },

  // protected
  {
    path: '',
    component: ProtectedLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'users',
        component: UsersPageComponent,
        canActivate: [adminGuard],
        data: {
          backTo: '/batches',
        },
      },
      {
        path: 'batches',
        component: BatchesPageComponent,
        data: { backTo: null },
      },
      {
        path: 'batches/:batchId/books',
        component: BooksPageComponent,
        canActivate: [batchPermissionGuard],
        data: {
          backTo: '/batches',
          permission: 'read',
        },
      },
      {
        path: 'batches/:batchId/books/capture',
        component: BookCaptureComponent,
        canActivate: [batchPermissionGuard],
        canDeactivate: [captureExitGuard],
        data: {
          backTo: '../',
          permission: 'write',
        },
      },
      {
        path: 'batches/:batchId/books/capture/:bookId',
        component: BookCaptureComponent,
        canActivate: [batchPermissionGuard],
        canDeactivate: [captureExitGuard],
        data: {
          backTo: '../',
          permission: 'write',
        },
      },

      {
        path: 'batches/:batchId/books/:bookId',
        component: BookDetailComponent,
        canActivate: [batchPermissionGuard],
        data: {
          backTo: '../',
          permission: 'read',
        },
      },
    ],
  },

  // fallback
  { path: '**', component: NotFoundComponent, canActivate: [authGuard] },
];
