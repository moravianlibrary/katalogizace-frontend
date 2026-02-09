import { ID, ImgItem } from '@/app/models';
import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-image-thumbnails',
  templateUrl: './thumbnails.component.html',
  imports: [CommonModule],
})
export class ImageThumbnailsComponent {
  items = input.required<ImgItem[]>();
  selectedId = input<ID | null>(null);

  select = output<ID>();

  onPick(id: ID) {
    this.select.emit(id);
  }
}
