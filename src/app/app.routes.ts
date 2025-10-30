import { Routes } from '@angular/router';
import { BooksListComponent } from './components/books-list/books-list.component';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: BooksListComponent },
  // rezervované do budúcna: detail /books/:id atď.
];
