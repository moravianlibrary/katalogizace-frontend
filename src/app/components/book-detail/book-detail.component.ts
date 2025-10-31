import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EditingPanelComponent } from '../editing-panel/editing-panel.component';
import { ImagesViewComponent } from '../images-view/images-view.component';
import { WorkingPanelComponent } from '../working-panel/working-panel.component';

@Component({
  standalone: true,
  selector: 'app-book-detail',
  imports: [ImagesViewComponent, EditingPanelComponent, WorkingPanelComponent],
  templateUrl: 'book-detail.component.html',
})
export class BookDetailComponent {
  private route = inject(ActivatedRoute);

  bookId = this.route.snapshot.paramMap.get('bookId') ?? '';
}
