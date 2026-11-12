import { computed, inject } from '@angular/core';
import { signalStore, withComputed, withHooks, withMethods } from '@ngrx/signals';
import { withEntities } from '@ngrx/signals/entities';
import { Post } from '../../01-domain-functions/a-companion-object/post';
import { PostsApi } from '../../shared/posts-api';
import { withRequestStatus } from '../../shared/with-request-status';
import { createLoadAll } from './create-load-all';
import { createToggleLike } from './create-toggle-like';

// Option B: the method bodies moved into factory files, the store wires them up.
// The store file is short, but each factory depends on PostsStoreInternals, a type
// that has to mirror this store by hand.
export const PostsStore = signalStore(
  { providedIn: 'root' },
  withEntities<Post>(),
  withRequestStatus(),
  withComputed(({ entities }) => ({
    publishedPosts: computed(() => entities().filter((post) => !Post.isDraft(post))),
    drafts: computed(() => entities().filter((post) => Post.isDraft(post))),
  })),
  withMethods((store, postsApi = inject(PostsApi)) => ({
    loadAll: createLoadAll(store, postsApi),
    toggleLike: createToggleLike(store, postsApi),
  })),
  withHooks({
    onInit(store) {
      void store.loadAll();
    },
  }),
);
