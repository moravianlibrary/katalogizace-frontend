import { TestBed } from '@angular/core/testing';
import { expect } from '@playwright/test';
import { beforeEach, describe, it } from 'node:test';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the global toast and confirm dialog outlets', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-toast')).not.toBeNull();
    expect(compiled.querySelector('app-confirm-dialog')).not.toBeNull();
  });
});
