import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods } from '@ngrx/signals';
import { setAllEntities, setEntity, withEntities } from '@ngrx/signals/entities';
import { User } from '../../shared/user';
import { Post, PostJson } from './post';

// The same minimal store with class instances as entities.
export const PostsStore = signalStore(
  withEntities<Post>(),
  withComputed(({ entities }) => ({
    drafts: computed(() => entities().filter((post) => post.isDraft())),
  })),
  withMethods((store) => ({
    // The extra step: server data must be turned into instances first. Forget the map()
    // once (a second endpoint, a websocket message, state restored from localStorage)
    // and the store holds plain objects that crash on `post.isDraft()`.
    setAll(postJsons: PostJson[]): void {
      patchState(store, setAllEntities(postJsons.map((postJson) => Post.fromJson(postJson))));
    },

    toggleLike(postId: string, user: User): void {
      const post = store.entityMap()[postId];
      if (post) {
        patchState(store, setEntity(post.toggleLike(user)));
      }
    },
  })),
);
