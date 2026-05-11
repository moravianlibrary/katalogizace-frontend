import { EditableMarcRecordDataField } from '@/app/models';
import { ContextPanelService } from '@/app/services/context-panel.service';
import { MarcDiffService } from '@/app/services/marc-diff.service';
import { RecordStateService } from '@/app/services/record-state.service';
import { ToastService } from '@/app/services/toast.service';
import { RecordStore } from '@/app/stores/record.store';
import { filterExistingRecord015to830 } from '@/app/utils/marc-filter';
import { compareSubfieldCodes } from '@/app/utils/marc-subfield-sort';
import { NgClass } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IconComponent } from '../../shared/icon/icon.component';

@Component({
  standalone: true,
  selector: 'app-context-panel-header',
  imports: [TranslateModule, NgClass, IconComponent],
  templateUrl: './context-panel-header.component.html',
})
export class ContextPanelHeaderComponent {
  private recordState = inject(RecordStateService);
  cps = inject(ContextPanelService);
  diff = inject(MarcDiffService);
  private store = inject(RecordStore);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);

  headerTitle = input.required<string>();
  canWrite = input<boolean>(false);

  toggleDisabled = computed(() => false);

  diffEnabled = this.diff.enabledByUser;

  showDiffToggle = computed(() => {
    return this.cps.state().mode === 'records';
  });

  canTakeRecord = computed(() => {
    return this.canWrite() && !!this.store.openedForDiff();
  });

  canResetRecord = computed(() => {
    return this.canWrite() && !!this.store.extracted();
  });

  canResetField = computed(() => {
    if (!this.canWrite()) return false;
    if (this.cps.state().mode !== 'edit') return false;

    const snapshot = this.cps.editSnapshot();
    const fieldId = this.cps.state().fieldId;
    const record = this.recordState.editableRecord();

    if (!snapshot || !fieldId || !record) return false;

    if (snapshot.kind === 'data') {
      const field = record.data_fields.find((f) => f.fieldId === fieldId);
      if (!field) return false;

      return (
        JSON.stringify(this.normalizeDataFieldState(field)) !==
        JSON.stringify(
          this.normalizeDataFieldState({
            ind1: snapshot.ind1,
            ind2: snapshot.ind2,
            subfields: snapshot.subfields ?? [],
          }),
        )
      );
    }

    if (snapshot.kind === 'control') {
      const field = record.control_fields.find((f) => f.fieldId === fieldId);
      if (!field) return false;

      return (field.value ?? '') !== (snapshot.value ?? '');
    }

    return false;
  });

  private showForbidden() {
    this.toast.show(
      this.translate.instant('messages.error.forbidden'),
      'error',
    );
  }

  private normalizeDataFieldState(field: {
    ind1?: string | null;
    ind2?: string | null;
    subfields?: { code?: string | null; value?: string | null }[] | null;
  }) {
    return {
      ind1: (field.ind1 ?? '').trim(),
      ind2: (field.ind2 ?? '').trim(),
      subfields: [...(field.subfields ?? [])]
        .map((sf) => ({
          code: (sf.code ?? '').trim(),
          value: (sf.value ?? '').trim(),
        }))
        .filter((sf) => sf.code.length === 1)
        .sort((a, b) => compareSubfieldCodes(a.code, b.code)),
    };
  }

  onResetField() {
    if (!this.canWrite()) {
      this.showForbidden();
      return;
    }

    this.cps.requestEditReset();
  }

  onBack() {
    const state = this.cps.state();
    const mode = state.mode === 'candidates_edit' ? 'edit' : 'records';

    if (state.mode === 'edit') {
      this.recordState.selectField('');
    }

    this.cps.setMode(mode, { tag: state.tag, fieldId: state.fieldId });
  }

  onCandidateConfirm() {
    if (!this.canWrite()) {
      this.showForbidden();
      return;
    }

    const id = this.cps.state().selectedCandidateId;
    if (!id) return;
    this.cps.confirmCandidate(id);
  }

  onCandidateConfirmEdit() {
    if (!this.canWrite()) {
      this.showForbidden();
      return;
    }

    const state = this.cps.state();
    const candidateId = state.selectedCandidateId;
    const fieldId = state.fieldId;

    if (!candidateId || !fieldId) return;

    const candidates = this.store.getCandidatesForField(fieldId);
    const candidate = candidates.find((c) => c.id === candidateId);
    if (!candidate) return;

    this.recordState.applyCandidateToEditableField(fieldId, candidate);
    this.cps.setMode('edit', { tag: state.tag, fieldId: state.fieldId });
  }

  candidatesCount = computed(() => {
    const field =
      this.recordState.selectedField()! as EditableMarcRecordDataField;
    const candidates = this.store.getCandidatesForField(field.fieldId);

    return candidates.length;
  });

  onShowCandidates() {
    const field =
      this.recordState.selectedField()! as EditableMarcRecordDataField;
    const candidates = this.store.getCandidatesForField(field.fieldId);

    if (!candidates.length) return;

    const normInd = (v: string | null | undefined) => (v ?? '').trim();

    const sameSubfields = (
      a: { code: string; value: string }[] | null | undefined,
      b: { code: string; value: string }[] | null | undefined,
    ) => {
      const aa = a ?? [];
      const bb = b ?? [];
      if (aa.length !== bb.length) return false;

      for (let i = 0; i < aa.length; i++) {
        if ((aa[i]?.code ?? '') !== (bb[i]?.code ?? '')) return false;
        if ((aa[i]?.value ?? '') !== (bb[i]?.value ?? '')) return false;
      }
      return true;
    };

    const exact = candidates.find((c) => {
      const rep = c.MARC_representation;
      return (
        normInd(rep.ind1) === normInd(field.ind1) &&
        normInd(rep.ind2) === normInd(field.ind2) &&
        sameSubfields(rep.subfields, field.subfields)
      );
    });

    const selectedId = (exact ?? candidates[candidates.length - 1]).id;

    this.cps.showCandidates(
      'candidates_edit',
      field.tag,
      field.fieldId,
      candidates,
      selectedId,
    );
  }

  onReset() {
    if (!this.canWrite()) {
      this.showForbidden();
      return;
    }

    this.recordState.loadFromExtracted(this.store.extracted());
  }

  onTakeRecord() {
    if (!this.canWrite()) {
      this.showForbidden();
      return;
    }

    const opened = this.store.openedForDiff();
    if (!opened) return;

    const isExtractedOpened = !!this.store.openedExtractedWithMeta();
    const rec = isExtractedOpened
      ? opened
      : filterExistingRecord015to830(opened);

    this.recordState.loadFromExistingOrLastEdited(rec);
  }
}
