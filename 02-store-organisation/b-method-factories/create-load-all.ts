import { patchState } from '@ngrx/signals';
import { setAllEntities } from '@ngrx/signals/entities';
import { firstValueFrom } from 'rxjs';
import { PostsApi } from '../../shared/posts-api';
import { setError, setFulfilled, setPending } from '../../shared/with-request-status';
import { PostsStoreInternals } from './posts-store-internals';

export function createLoadAll(store: PostsStoreInternals, postsApi: PostsApi) {
  return async (): Promise<void> => {
    patchState(store, setPending());
    try {
      const posts = await firstValueFrom(postsApi.fetchAll());
      patchState(store, setAllEntities(posts), setFulfilled());
    } catch (error) {
      patchState(store, setError(String(error)));
    }
  };
}
