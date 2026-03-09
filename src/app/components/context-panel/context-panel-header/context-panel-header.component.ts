import { EditableMarcRecordDataField } from '@/app/models';
import { ContextPanelService } from '@/app/services/context-panel.service';
import { MarcDiffService } from '@/app/services/marc-diff.service';
import { RecordStateService } from '@/app/services/record-state.service';
import { RecordStore } from '@/app/stores/record.store';
import { filterExistingRecord015to830 } from '@/app/utils/marc-filter';
import { NgClass } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  standalone: true,
  selector: 'app-context-panel-header',
  imports: [TranslateModule, NgClass],
  templateUrl: './context-panel-header.component.html',
})
export class ContextPanelHeaderComponent {
  private recordState = inject(RecordStateService);
  cps = inject(ContextPanelService);
  diff = inject(MarcDiffService);
  private store = inject(RecordStore);

  headerTitle = input.required<string>();

  toggleDisabled = computed(() => false);

  diffEnabled = this.diff.enabledByUser;
  viewMode = this.recordState.viewMode;

  showDiffToggle = computed(() => {
    return this.viewMode() === 'table' && this.cps.state().mode === 'records';
  });

  canTakeRecord = computed(() => !!this.store.openedForDiff());

  canResetRecord = computed(() => !!this.store.extracted());

  canResetField = computed(
    () => this.cps.state().mode === 'edit' && !!this.cps.editSnapshot(),
  );

  onResetField() {
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
    const id = this.cps.state().selectedCandidateId;
    if (!id) return;
    this.cps.confirmCandidate(id);
  }

  onCandidateConfirmEdit() {
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
    this.recordState.loadFromExtracted(this.store.extracted());
  }

  onTakeRecord() {
    const opened = this.store.openedForDiff();
    if (!opened) return;

    const isExtractedOpened = !!this.store.openedExtractedWithMeta();
    const rec = isExtractedOpened
      ? opened
      : filterExistingRecord015to830(opened);

    this.recordState.loadFromExistingOrLastEdited(rec);
  }
}
