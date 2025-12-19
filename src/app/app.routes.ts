import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { BookCaptureNativeComponent } from './components/book-capture-native/book-capture-native.component';
import { BookCaptureComponent } from './components/book-capture/book-capture.component';
import { BookDetailComponent } from './components/book-detail/book-detail.component';
import { BooksListComponent } from './components/books-list/books-list.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';

export const routes: Routes = [
  { path: '', redirectTo: 'books', pathMatch: 'full' },

  // public
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  // protected
  { path: 'books', component: BooksListComponent, canActivate: [authGuard] },
  {
    path: 'books/capture',
    component: BookCaptureComponent,
    canActivate: [authGuard],
  },
  {
    path: 'books/capture-native',
    component: BookCaptureNativeComponent,
    canActivate: [authGuard],
  },
  {
    path: 'books/:bookId',
    component: BookDetailComponent,
    canActivate: [authGuard],
  },

  // fallback
  { path: '**', redirectTo: 'books' },
];
