import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { signalStore, withHooks, withMethods } from '@ngrx/signals';
import { withEntities } from '@ngrx/signals/entities';
import { Post } from '../../01-domain-functions/a-companion-object/post';
import { withPostLikes } from '../../02-store-organisation/c-store-features/with-post-likes';
import { withPostLoading } from '../../02-store-organisation/c-store-features/with-post-loading';
import { SessionStore } from '../../shared/session.store';

// Option B: the store answers the view's questions itself.
// PostsStore now depends on SessionStore and Router, and every screen that needs
// "a post from the viewer's point of view" adds more methods here.
export const PostsStore = signalStore(
  { providedIn: 'root' },
  withEntities<Post>(),
  withPostLoading(),
  withPostLikes(),
  withMethods((store, sessionStore = inject(SessionStore), router = inject(Router)) => ({
    isLikedByViewer(post: Post): boolean {
      const viewer = sessionStore.currentUser();
      return viewer !== null && Post.isLikedBy(post, viewer);
    },

    canViewerEdit(post: Post): boolean {
      const viewer = sessionStore.currentUser();
      return viewer !== null && Post.isEditableBy(post, viewer);
    },

    toggleLikeAsViewer(post: Post): void {
      const viewer = sessionStore.currentUser();
      if (viewer === null) {
        void router.navigate(['/sign-in']);
        return;
      }
      void store.toggleLike(post.id, viewer);
    },

    editPost(post: Post): void {
      void router.navigate(['/posts', post.id, 'edit']);
    },
  })),
  withHooks({
    onInit(store) {
      void store.loadAll();
    },
  }),
);
