import { Component, input } from '@angular/core';

@Component({
  standalone: true,
  selector: 'tr[appMarcRowLeader]',
  templateUrl: './marc-row-leader.component.html',
})
export class MarcRowLeaderComponent {
  leader = input.required<string>();
}
