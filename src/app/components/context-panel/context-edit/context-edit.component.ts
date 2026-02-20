import { FieldEditService } from '@/app/services/edit.service';
import { Component, inject } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-context-edit',
  imports: [],
  templateUrl: './context-edit.component.html',
})
export class ContextEditComponent {
  edit = inject(FieldEditService);
}
