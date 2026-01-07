import { CanDeactivateFn } from '@angular/router';

export type CaptureExitAware = {
  cleanupOnExit: () =>
    | boolean
    | Promise<boolean>
    | import('rxjs').Observable<boolean>;
};

export const captureExitGuard: CanDeactivateFn<CaptureExitAware> = (
  component,
) => {
  if (!component || !component.cleanupOnExit) {
    return true;
  }
  return component.cleanupOnExit();
};
