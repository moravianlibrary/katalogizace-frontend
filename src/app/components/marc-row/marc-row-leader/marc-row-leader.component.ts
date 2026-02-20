import { Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  standalone: true,
  selector: 'tr[appMarcRowLeader]',
  imports: [TranslateModule],
  templateUrl: './marc-row-leader.component.html',
})
export class MarcRowLeaderComponent {
  leader = input.required<string>();
  editable = input<boolean>(false);
}
