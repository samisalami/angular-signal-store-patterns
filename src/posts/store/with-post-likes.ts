import { inject } from '@angular/core';
import { patchState, signalStoreFeature, type, withMethods } from '@ngrx/signals';
import { EntityState, setEntity } from '@ngrx/signals/entities';
import { firstValueFrom } from 'rxjs';
import { User } from '../../users/user';
import { Post } from '../post';
import { PostsApi } from '../posts-api';

// Domain store feature: liking posts, optimistic with rollback.
// The rule "what does liking do to a post" lives in Post.toggleLike; this feature only adds
// the store and server side of it.
export function withPostLikes() {
  return signalStoreFeature(
    { state: type<EntityState<Post>>() },
    withMethods((store, postsApi = inject(PostsApi)) => ({
      async toggleLike(postId: string, user: User): Promise<void> {
        const previousPost = store.entityMap()[postId];
        if (!previousPost) {
          return;
        }
        const toggledPost = Post.toggleLike(previousPost, user);
        patchState(store, setEntity(toggledPost));
        try {
          await firstValueFrom(postsApi.updateLikes(postId, toggledPost.likedBy));
        } catch {
          patchState(store, setEntity(previousPost));
        }
      },
    })),
  );
}
