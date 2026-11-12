import { computed } from '@angular/core';
import { signalStore, withComputed, withHooks } from '@ngrx/signals';
import { withEntities } from '@ngrx/signals/entities';
import { Post } from '../../01-domain-functions/a-companion-object/post';
import { withPostLikes } from './with-post-likes';
import { withPostLoading } from './with-post-loading';

// The store only composes. State shape, features, a few derived views, lifecycle.
export const PostsStore = signalStore(
  { providedIn: 'root' },
  withEntities<Post>(),
  withPostLoading(),
  withPostLikes(),
  withComputed(({ entities }) => ({
    publishedPosts: computed(() => entities().filter((post) => !Post.isDraft(post))),
    drafts: computed(() => entities().filter((post) => Post.isDraft(post))),
  })),
  withHooks({
    onInit(store) {
      void store.loadAll();
    },
  }),
);
