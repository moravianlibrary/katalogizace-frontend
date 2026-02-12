import { Component, input } from '@angular/core';

@Component({
  standalone: true,
  selector: 'tr[appMarcRowControl]',
  templateUrl: './marc-row-control.component.html',
})
export class MarcRowControlComponent {
  cf = input.required<{ tag: string; value: string }>();
}
