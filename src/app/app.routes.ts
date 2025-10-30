import { Routes } from '@angular/router';
import { BooksListComponent } from './components/books-list/books-list.component';

export const routes: Routes = [
  { path: '', redirectTo: 'books', pathMatch: 'full' },
  { path: 'books', component: BooksListComponent },
  // rezervované do budúcna: detail /books/:id atď.
];
