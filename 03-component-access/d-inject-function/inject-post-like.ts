import { computed, inject, Signal } from '@angular/core';
import { Router } from '@angular/router';
import { Post } from '../../01-domain-functions/a-companion-object/post';
import { PostsStore } from '../../02-store-organisation/c-store-features/posts.store';
import { SessionStore } from '../../shared/session.store';

// Option D: an inject function, the Angular counterpart of a Vue composable or a React hook.
// It covers ONE concern: liking a post as the signed-in user. Every view with a like
// button uses it, whatever else that view shows.
//
// Must be called in an injection context (field initializer or constructor).
export function injectPostLike(postId: Signal<string>) {
  const postsStore = inject(PostsStore);
  const sessionStore = inject(SessionStore);
  const router = inject(Router);

  const post = computed<Post | undefined>(() => postsStore.entityMap()[postId()]);

  const isLiked = computed(() => {
    const currentPost = post();
    const viewer = sessionStore.currentUser();
    return currentPost !== undefined && viewer !== null && Post.isLikedBy(currentPost, viewer);
  });

  const likeCount = computed(() => post()?.likedBy.length ?? 0);

  return {
    isLiked,
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
  };
}
