import { NgClass } from '@angular/common';
import {
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type DropdownOption = {
  value: string;
  label: string;
};

@Component({
  standalone: true,
  selector: 'app-input-dropdown',
  imports: [NgClass],
  templateUrl: './input-dropdown.component.html',
})
export class InputDropdownComponent {
  private translate = inject(TranslateService);

  value = input<string>('');
  placeholder = input<string>(
    this.translate.instant('field_edit.undefined_indicator'),
  );
  options = input<DropdownOption[]>([]);
  disabled = input<boolean>(false);

  valueChange = output<string>();

  open = signal(false);

  selectedLabel = computed(() => {
    const v = this.value();
    const opt = this.options().find((o) => o.value === v);
    return opt?.label ?? '';
  });

  toggle() {
    if (this.disabled()) return;
    this.open.update((x) => !x);
  }

  close() {
    this.open.set(false);
  }

  select(v: string) {
    this.valueChange.emit(v);
    this.close();
  }
}
