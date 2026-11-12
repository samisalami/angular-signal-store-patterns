import { computed, inject, Signal } from '@angular/core';
import { Router } from '@angular/router';
import { Post } from '../../01-domain-functions/a-companion-object/post';
import { PostsStore } from '../../02-store-organisation/c-store-features/posts.store';
import { SessionStore } from '../../shared/session.store';

// Option D: a second inject function for a second concern: what the signed-in user
// may do with a post. It grows when a new permission appears (delete, publish…),
// not when a new view appears.
//
// Must be called in an injection context (field initializer or constructor).
export function injectPostPermissions(postId: Signal<string>) {
  const postsStore = inject(PostsStore);
  const sessionStore = inject(SessionStore);
  const router = inject(Router);

  const canEdit = computed(() => {
    const currentPost: Post | undefined = postsStore.entityMap()[postId()];
    const viewer = sessionStore.currentUser();
    return currentPost !== undefined && viewer !== null && Post.isEditableBy(currentPost, viewer);
  });

  return {
    canEdit,

    edit(): void {
      void router.navigate(['/posts', postId(), 'edit']);
    },
  };
}
