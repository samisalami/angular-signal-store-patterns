import { DestroyRef, inject } from '@angular/core';
import { signalStoreFeature, withHooks } from '@ngrx/signals';

// Knows nothing about posts or any store shape: it gets a plain callback.
export function withAutoRefresh(refresh: () => void, intervalMs: number) {
  return signalStoreFeature(
    withHooks({
      onInit() {
        const intervalId = setInterval(refresh, intervalMs);
        inject(DestroyRef).onDestroy(() => clearInterval(intervalId));
      },
    }),
  );
}
