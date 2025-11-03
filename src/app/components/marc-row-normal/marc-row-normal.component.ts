import { Component, input } from '@angular/core';

@Component({
  standalone: true,
  selector: 'tr[appMarcRowNormal]',
  host: { class: 'border-b-[0.5px] border-gray-500 align-top' },
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
