import { computed, inject, Signal } from '@angular/core';
import { Router } from '@angular/router';
import { Post } from '../../01-domain-functions/a-companion-object/post';
import { SessionStore } from '../../shared/session.store';

// Option D: a second inject function for a second concern: what the signed-in user
// may do with a post. It grows when a new permission appears (delete, publish…),
// not when a new view appears.
//
// Must be called in an injection context (field initializer or constructor).
export function injectPostPermissions(post: Signal<Post>) {
  const sessionStore = inject(SessionStore);
  const router = inject(Router);

  const canEdit = computed(() => {
    const viewer = sessionStore.currentUser();
    return viewer !== null && Post.isEditableBy(post(), viewer);
  });

  return {
    canEdit,

    edit(): void {
      void router.navigate(['/posts', post().id, 'edit']);
    },
  };
}
