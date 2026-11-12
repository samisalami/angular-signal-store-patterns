import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { User } from './user';

// Who is signed in. Deliberately tiny: it exists so injectPost() has a second store to combine.
export const SessionStore = signalStore(
  { providedIn: 'root' },
  withState<{ currentUser: User | null }>({ currentUser: null }),
  withComputed(({ currentUser }) => ({
    isSignedIn: computed(() => currentUser() !== null),
  })),
  withMethods((store) => ({
    signIn(user: User): void {
      patchState(store, { currentUser: user });
    },
    signOut(): void {
      patchState(store, { currentUser: null });
    },
  })),
);
