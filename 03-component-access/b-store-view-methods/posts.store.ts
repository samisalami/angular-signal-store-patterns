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
// "post X from the viewer's point of view" adds more methods here.
export const PostsStore = signalStore(
  { providedIn: 'root' },
  withEntities<Post>(),
  withPostLoading(),
  withPostLikes(),
  withMethods((store, sessionStore = inject(SessionStore), router = inject(Router)) => ({
    isLikedByViewer(postId: string): boolean {
      const post: Post | undefined = store.entityMap()[postId];
      const viewer = sessionStore.currentUser();
      return post !== undefined && viewer !== null && Post.isLikedBy(post, viewer);
    },

    canViewerEdit(postId: string): boolean {
      const post: Post | undefined = store.entityMap()[postId];
      const viewer = sessionStore.currentUser();
      return post !== undefined && viewer !== null && Post.isEditableBy(post, viewer);
    },

    toggleLikeAsViewer(postId: string): void {
      const viewer = sessionStore.currentUser();
      if (viewer === null) {
        void router.navigate(['/sign-in']);
        return;
      }
      void store.toggleLike(postId, viewer);
    },

    editPost(postId: string): void {
      void router.navigate(['/posts', postId, 'edit']);
    },
  })),
  withHooks({
    onInit(store) {
      void store.loadAll();
    },
  }),
);
