import { patchState } from '@ngrx/signals';
import { setEntity } from '@ngrx/signals/entities';
import { firstValueFrom } from 'rxjs';
import { Post } from '../../01-domain-functions/a-companion-object/post';
import { PostsApi } from '../../shared/posts-api';
import { User } from '../../shared/user';
import { PostsStoreInternals } from './posts-store-internals';

export function createToggleLike(store: PostsStoreInternals, postsApi: PostsApi) {
  return async (postId: string, user: User): Promise<void> => {
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
  };
}
