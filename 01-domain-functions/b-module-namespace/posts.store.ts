import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods } from '@ngrx/signals';
import { setAllEntities, setEntity, withEntities } from '@ngrx/signals/entities';
import { User } from '../../shared/user';
import * as Post from './post';

// The same minimal store as option A. The only difference is the type name: Post.Post.
export const PostsStore = signalStore(
  withEntities<Post.Post>(),
  withComputed(({ entities }) => ({
    drafts: computed(() => entities().filter((post) => Post.isDraft(post))),
  })),
  withMethods((store) => ({
    setAll(posts: Post.Post[]): void {
      patchState(store, setAllEntities(posts));
    },

    toggleLike(postId: string, user: User): void {
      const post = store.entityMap()[postId];
      if (post) {
        patchState(store, setEntity(Post.toggleLike(post, user)));
      }
    },
  })),
);
