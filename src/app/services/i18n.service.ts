import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type AppLang = 'cs' | 'en';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly t = inject(TranslateService);

  private readonly storageKey = 'app_lang';
  readonly supported: AppLang[] = ['cs', 'en'];

  init() {
    const saved = localStorage.getItem(this.storageKey) as AppLang | null;
    const initial: AppLang =
      saved && this.supported.includes(saved) ? saved : 'cs';

    this.t.addLangs(this.supported);
    this.t.setFallbackLang('cs');
    this.t.use(initial);
  }

  setLang(lang: AppLang) {
    this.t.use(lang);
    localStorage.setItem(this.storageKey, lang);
  }

  get current(): AppLang {
    return (this.t.getCurrentLang() as AppLang) || 'cs';
  }
}
