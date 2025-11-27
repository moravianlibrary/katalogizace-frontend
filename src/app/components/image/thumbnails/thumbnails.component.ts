import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { ImgItem } from './../../../models/book';

@Component({
  standalone: true,
  selector: 'app-image-thumbnails',
  templateUrl: './thumbnails.component.html',
  imports: [CommonModule],
})
export class ImageThumbnailsComponent {
  items = input.required<ImgItem[]>();
  selectedId = input<string | null>(null);

  select = output<string>();

  onPick(id: string) {
    this.select.emit(id);
  }
}
