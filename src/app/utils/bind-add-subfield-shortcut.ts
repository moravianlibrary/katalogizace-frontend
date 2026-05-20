import { UUID } from '@/app/models';
import { ContextPanelService } from '@/app/services/context-panel.service';
import { effect, untracked } from '@angular/core';

export function bindAddSubfieldShortcut(params: {
  cps: ContextPanelService;
  fieldId: () => UUID;
  openDialog: () => void;
}) {
  let initialized = false;
  let lastNonce = 0;

  effect(() => {
    const nonce = params.cps.addSubfieldDialogOpenNonce();
    const state = params.cps.state();
    const currentFieldId = params.fieldId();

    if (!initialized) {
      initialized = true;
      lastNonce = nonce;
      return;
    }

    const isEditingThisField =
      state.mode === 'edit' && state.fieldId === currentFieldId;

    if (!isEditingThisField) {
      lastNonce = nonce;
      return;
    }

    if (nonce === lastNonce) return;
    lastNonce = nonce;

    untracked(() => {
      params.openDialog();
    });
  });
}
