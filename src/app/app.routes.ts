import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';

import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';

import { BookCaptureNativeComponent } from './components/book-capture-native/book-capture-native.component';
import { BookCaptureComponent } from './components/book-capture/book-capture.component';
import { BookDetailComponent } from './components/book-detail/book-detail.component';
import { BooksListComponent } from './components/books-list/books-list.component';

import { BatchesListComponent } from './components/batches-list/batches-list.component';
import { ForbiddenComponent } from './components/forbidden/forbidden.component';
import { ProtectedLayoutComponent } from './components/layout/protected-layout/protected-layout.component';
import { batchPermissionGuard } from './guards/batch-permission.guard';
import { captureExitGuard } from './guards/capture-exit.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'batches', pathMatch: 'full' },

  // public
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [guestGuard] },

  {
    path: 'forbidden',
    component: ForbiddenComponent,
    canActivate: [authGuard],
  },

  // protected
  {
    path: '',
    component: ProtectedLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'batches',
        component: BatchesListComponent,
        data: { backTo: null },
      },
      {
        path: 'batches/:batchId/books',
        component: BooksListComponent,
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
        path: 'batches/:batchId/books/capture-native',
        component: BookCaptureNativeComponent,
        canActivate: [batchPermissionGuard],
        canDeactivate: [captureExitGuard],
        data: {
          backTo: '../',
          permission: 'write',
        },
      },
      {
        path: 'batches/:batchId/books/capture-native/:bookId',
        component: BookCaptureNativeComponent,
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
  { path: '**', redirectTo: 'batches' },
];
