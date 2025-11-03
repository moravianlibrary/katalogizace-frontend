import { Component, input } from '@angular/core';

@Component({
  standalone: true,
  selector: 'tr[appMarcRowNormal]',
  templateUrl: './marc-row-normal.component.html',
})
export class MarcRowNormalComponent {
  nf = input.required<{
    tag: string;
    ind1?: string;
    ind2?: string;
    subfields?: { code: string; value: string }[];
  }>();
}
