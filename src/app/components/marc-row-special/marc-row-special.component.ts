import { Component, input } from '@angular/core';

@Component({
  standalone: true,
  selector: 'tr[appMarcRowSpecial]',
  templateUrl: './marc-row-special.component.html',
})
export class MarcRowSpecialComponent {
  sf = input.required<{ tag: string; value: string }>();
}
