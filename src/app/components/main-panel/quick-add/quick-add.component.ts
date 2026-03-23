import { QuickAddItem } from '@/app/models/shared/record-state';
import { Component, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  standalone: true,
  selector: 'app-quick-add',
  imports: [TranslateModule],
  templateUrl: './quick-add.component.html',
})
export class QuickAddComponent {
  items = input.required<QuickAddItem[]>();
  add = output<QuickAddItem>();

  onAdd(it: QuickAddItem) {
    this.add.emit(it);
  }
}
