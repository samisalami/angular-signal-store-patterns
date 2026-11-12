import { computed, inject, Signal } from '@angular/core';
import { Router } from '@angular/router';
import { SessionStore } from '../users/session.store';
import { Post } from './post';
import { PostsStore } from './store/posts.store';

// Inject function: the Angular counterpart of a Vue composable or a React hook.
// It answers "what does a component need to show and act on ONE post for the signed-in user?"
// by combining two stores, the router and the Post domain rules. Components stay dumb.
//
// Must be called in an injection context (field initializer or constructor).
export function injectPost(postId: Signal<string>) {
  const postsStore = inject(PostsStore);
  const sessionStore = inject(SessionStore);
  const router = inject(Router);

  const post = computed<Post | undefined>(() => postsStore.entityMap()[postId()]);

  const isLiked = computed(() => {
    const currentPost = post();
    const viewer = sessionStore.currentUser();
    return currentPost !== undefined && viewer !== null && Post.isLikedBy(currentPost, viewer);
  });

  const canEdit = computed(() => {
    const currentPost = post();
    const viewer = sessionStore.currentUser();
    return currentPost !== undefined && viewer !== null && Post.isEditableBy(currentPost, viewer);
  });

  const likeCount = computed(() => post()?.likedBy.length ?? 0);

  return {
    post,
    isLiked,
    canEdit,
    likeCount,

    toggleLike(): void {
      const viewer = sessionStore.currentUser();
      if (viewer === null) {
        // not signed in -> send them to sign in instead of failing silently
        void router.navigate(['/sign-in']);
        return;
      }
      void postsStore.toggleLike(postId(), viewer);
    },

    edit(): void {
      void router.navigate(['/posts', postId(), 'edit']);
    },
  };
}
