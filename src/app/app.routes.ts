import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { guestGuard } from './auth/guest.guard';

import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';

import { BookCaptureNativeComponent } from './components/book-capture-native/book-capture-native.component';
import { BookCaptureComponent } from './components/book-capture/book-capture.component';
import { BookDetailComponent } from './components/book-detail/book-detail.component';
import { BooksListComponent } from './components/books-list/books-list.component';

import { BatchesListComponent } from './components/batches-list/batches-list.component';
import { ProtectedLayoutComponent } from './components/layout/protected-layout/protected-layout.component';

export const routes: Routes = [
  { path: '', redirectTo: 'batches', pathMatch: 'full' },

  // public
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [guestGuard] },

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
        data: { backTo: '/batches' },
      },
      {
        path: 'batches/:batchId/books/capture',
        component: BookCaptureComponent,
        data: { backTo: '../' },
      },
      {
        path: 'batches/:batchId/books/capture-native',
        component: BookCaptureNativeComponent,
        data: { backTo: '../' },
      },
      {
        path: 'batches/:batchId/books/:bookId',
        component: BookDetailComponent,
        data: { backTo: '../' },
      },

      // { path: 'books', component: BooksListComponent },
      // { path: 'books/capture', component: BookCaptureComponent },
      // { path: 'books/capture-native', component: BookCaptureNativeComponent },
      // { path: 'books/:bookId', component: BookDetailComponent },
    ],
  },

  // fallback
  { path: '**', redirectTo: 'batches' },
];
