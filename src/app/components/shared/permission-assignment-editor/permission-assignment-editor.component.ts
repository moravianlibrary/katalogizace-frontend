import { Permission, type UserRole } from '@/app/models';
import { AppIconName } from '@/app/models/shared/icon.model';
import { NgClass } from '@angular/common';
import {
  Component,
  computed,
  ElementRef,
  input,
  output,
  QueryList,
  signal,
  ViewChildren,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { IconComponent } from '../../icon/icon.component';

export type PermissionAssignmentOption = {
  id: number;
  title: string;
  subtitle?: string | null;
  role?: UserRole | null;
  icon?: AppIconName | null;
};

export type PermissionAssignmentRow = PermissionAssignmentOption & {
  permissions: Permission[];
};

export type PermissionAssignmentToggle = {
  rowId: number;
  permission: Permission;
  checked: boolean;
};

const PERMISSION_OPTIONS: {
  value: Permission;
  icon: AppIconName;
}[] = [
  { value: 'read', icon: 'book' },
  { value: 'write', icon: 'edit' },
  { value: 'delete', icon: 'trash' },
  { value: 'export', icon: 'export' },
  { value: 'edit', icon: 'settings' },
];

@Component({
  standalone: true,
  selector: 'app-permission-assignment-editor',
  imports: [NgClass, TranslateModule, IconComponent],
  templateUrl: './permission-assignment-editor.component.html',
})
export class PermissionAssignmentEditorComponent {
  sectionLabelKey = input<string>('');
  searchPlaceholderKey = input<string>('');
  noAvailableLabelKey = input<string>('');
  emptyRowsLabelKey = input<string>('');
  loadingRowsLabelKey = input<string | null>(null);
  toggleButtonAriaLabel = input<string>('toggle options');
  disabled = input<boolean>(false);
  loadingOptions = input<boolean>(false);
  loadingRows = input<boolean>(false);
  options = input<PermissionAssignmentOption[]>([]);
  rows = input<PermissionAssignmentRow[]>([]);

  readonly pickerOpened = output<void>();
  readonly addRequested = output<number>();
  readonly removeRequested = output<number>();
  readonly removeAllRequested = output<void>();
  readonly permissionToggled = output<PermissionAssignmentToggle>();

  readonly permissionOptions = PERMISSION_OPTIONS;
  readonly searchInput = signal('');
  readonly pickerOpen = signal(false);
  readonly selectedOptionId = signal<number | null>(null);
  readonly activeIndex = signal(0);

  @ViewChildren('optionButton')
  optionButtons!: QueryList<ElementRef<HTMLButtonElement>>;

  readonly selectedRowIds = computed(() => {
    return new Set(this.rows().map((row) => row.id));
  });

  readonly availableOptions = computed(() => {
    const q = this.searchInput().trim().toLowerCase();
    const selectedIds = this.selectedRowIds();

    return this.options()
      .filter((option) => !selectedIds.has(option.id))
      .filter((option) => {
        if (!q) return true;

        return (
          option.title.toLowerCase().includes(q) ||
          (option.subtitle ?? '').toLowerCase().includes(q)
        );
      })
      .slice(0, 20);
  });

  readonly selectedOption = computed(() => {
    const selectedId = this.selectedOptionId();
    if (selectedId == null) return null;

    return (
      this.availableOptions().find((option) => option.id === selectedId) ?? null
    );
  });

  closePicker() {
    this.pickerOpen.set(false);
    this.restoreSelectedInput();
  }

  private restoreSelectedInput() {
    const option = this.selectedOption();
    if (!option) return;

    if (!this.searchInput().trim()) {
      this.searchInput.set(option.title);
    }
  }

  onSearchFocus() {
    this.openPicker();

    if (this.selectedOption()) {
      this.searchInput.set('');
    }
  }

  onSearchInput(event: Event) {
    this.searchInput.set((event.target as HTMLInputElement).value);
    this.selectedOptionId.set(null);
    this.activeIndex.set(0);
    this.pickerOpen.set(true);
  }

  togglePicker() {
    if (this.disabled()) return;

    if (this.pickerOpen()) {
      this.closePicker();
      return;
    }

    this.openPicker();

    if (this.selectedOption()) {
      this.searchInput.set('');
    }
  }

  openPicker() {
    if (this.disabled()) return;

    this.pickerOpened.emit();
    this.pickerOpen.set(true);
  }

  selectOption(option: PermissionAssignmentOption) {
    this.selectedOptionId.set(option.id);
    this.searchInput.set(option.title);
    this.activeIndex.set(0);
    this.pickerOpen.set(false);
  }

  addSelectedOption() {
    const option = this.selectedOption();
    if (!option) return;

    this.addRequested.emit(option.id);

    this.searchInput.set('');
    this.selectedOptionId.set(null);
    this.activeIndex.set(0);
    this.pickerOpen.set(false);
  }

  removeAll() {
    this.removeAllRequested.emit();
    this.searchInput.set('');
    this.selectedOptionId.set(null);
    this.activeIndex.set(0);
    this.pickerOpen.set(false);
  }

  hasPermission(rowId: number, permission: Permission): boolean {
    return (
      this.rows()
        .find((row) => row.id === rowId)
        ?.permissions.includes(permission) ?? false
    );
  }

  togglePermission(rowId: number, permission: Permission, event: Event) {
    this.permissionToggled.emit({
      rowId,
      permission,
      checked: (event.target as HTMLInputElement).checked,
    });
  }

  onPickerKeydown(event: KeyboardEvent) {
    if (this.disabled()) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();

      const wasOpen = this.pickerOpen();
      this.openPicker();

      if (wasOpen) {
        this.moveActiveIndex(1);
      } else {
        this.activeIndex.set(0);
      }

      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();

      const wasOpen = this.pickerOpen();
      this.openPicker();

      if (wasOpen) {
        this.moveActiveIndex(-1);
      } else {
        this.activeIndex.set(Math.max(0, this.availableOptions().length - 1));
      }

      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();

      if (this.pickerOpen()) {
        this.selectActiveOption();
        return;
      }

      if (this.selectedOption()) {
        this.addSelectedOption();
      }

      return;
    }

    if (event.key === 'Escape' && this.pickerOpen()) {
      event.preventDefault();
      event.stopPropagation();
      this.closePicker();
    }
  }

  private moveActiveIndex(direction: 1 | -1) {
    const count = this.availableOptions().length;
    if (count === 0) return;

    this.activeIndex.update((index) => {
      return (index + direction + count) % count;
    });

    this.scrollActiveOptionIntoView();
  }

  private scrollActiveOptionIntoView() {
    requestAnimationFrame(() => {
      this.optionButtons
        ?.get(this.activeIndex())
        ?.nativeElement.scrollIntoView({
          block: 'nearest',
        });
    });
  }

  private selectActiveOption() {
    const option = this.availableOptions()[this.activeIndex()];
    if (!option) return;

    this.selectOption(option);
  }
}
