import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods } from '@ngrx/signals';
import { setAllEntities, setEntity, withEntities } from '@ngrx/signals/entities';
import { User } from '../../shared/user';
import { Post } from './post';

// How a store uses the domain functions. Kept minimal on purpose (no server, no loading);
// chapter 2 builds the full store.
export const PostsStore = signalStore(
  withEntities<Post>(),
  withComputed(({ entities }) => ({
    // a query inside a computed -> the store offers ready-made, parameterless views of its state
    drafts: computed(() => entities().filter((post) => Post.isDraft(post))),
  })),
  withMethods((store) => ({
    setAll(posts: Post[]): void {
      patchState(store, setAllEntities(posts));
    },

    // a transition inside a method -> the domain function decides WHAT the new post is,
    // the store decides THAT it is saved
    toggleLike(postId: string, user: User): void {
      const post = store.entityMap()[postId];
      if (post) {
        patchState(store, setEntity(Post.toggleLike(post, user)));
      }
    },
  })),
);
