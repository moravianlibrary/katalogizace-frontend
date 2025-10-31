import { Routes } from '@angular/router';
import { BookDetailComponent } from './components/book-detail/book-detail.component';
import { BooksListComponent } from './components/books-list/books-list.component';

export const routes: Routes = [
  { path: '', redirectTo: 'books', pathMatch: 'full' },
  { path: 'books', component: BooksListComponent },
  { path: 'books/:bookId', component: BookDetailComponent },
  // rezervované do budúcna: detail /books/:id atď.
];
