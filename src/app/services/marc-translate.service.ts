import { MARC_VALUE_DEFINITIONS } from '@/app/shared/marc/marc-value-definitions';
import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export interface TranslateDropdownItem {
  code: string;
  translatedLabel?: string;
}

@Injectable({ providedIn: 'root' })
export class MarcTranslateService {
  private readonly translate = inject(TranslateService);

  getMarcStaticValueDefinition(fullCode: string) {
    const norm = (fullCode || '').trim();
    return MARC_VALUE_DEFINITIONS.find((d) => d.fullCode === norm) ?? null;
  }

  getMarcStaticValueItems(fullCode: string): TranslateDropdownItem[] {
    const def = this.getMarcStaticValueDefinition(fullCode);
    if (!def) return [];

    const items = def.options.map((code) => {
      const key = `${def.translationPrefix}${code}`;
      const t = this.translate.instant(key);
      const hasTranslation = !!t && t !== key;

      return {
        code,
        translatedLabel: hasTranslation ? t : undefined,
      } satisfies TranslateDropdownItem;
    });

    return items.sort((a, b) => {
      const aT = !!a.translatedLabel;
      const bT = !!b.translatedLabel;
      if (aT !== bT) return aT ? -1 : 1;

      const aKey = (a.translatedLabel ?? a.code ?? '').toLowerCase();
      const bKey = (b.translatedLabel ?? b.code ?? '').toLowerCase();
      return aKey.localeCompare(bKey, 'cs');
    });
  }
}
