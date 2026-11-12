import { computed } from '@angular/core';
import { signalStore, withComputed, withFeature, withHooks } from '@ngrx/signals';
import { withEntities } from '@ngrx/signals/entities';
import { Post } from '../../01-domain-functions/a-companion-object/post';
import { withPostLikes } from '../c-store-features/with-post-likes';
import { withPostLoading } from '../c-store-features/with-post-loading';
import { withAutoRefresh } from './with-auto-refresh';

// Option D: option C plus a feature that receives store members as callbacks.
// withFeature (NgRx 20+) hands the store built so far to a function, so the
// feature can be given `store.loadAll` without knowing what a posts store is.
export const PostsStore = signalStore(
  { providedIn: 'root' },
  withEntities<Post>(),
  withPostLoading(),
  withPostLikes(),
  withComputed(({ entities }) => ({
    publishedPosts: computed(() => entities().filter((post) => !Post.isDraft(post))),
    drafts: computed(() => entities().filter((post) => Post.isDraft(post))),
  })),
  withFeature((store) => withAutoRefresh(() => void store.loadAll(), 60_000)),
  withHooks({
    onInit(store) {
      void store.loadAll();
    },
  }),
);
