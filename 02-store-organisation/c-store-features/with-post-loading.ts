import { inject } from '@angular/core';
import { patchState, signalStoreFeature, type, withMethods } from '@ngrx/signals';
import { EntityState, setAllEntities } from '@ngrx/signals/entities';
import { firstValueFrom } from 'rxjs';
import {
  setError,
  setFulfilled,
  setPending,
  withRequestStatus,
} from '../../shared/with-request-status';
import { Post } from '../../01-domain-functions/a-companion-object/post';
import { PostsApi } from '../../shared/posts-api';

// Domain store feature: loading posts.
// The `type<>()` input is the contract -> it only plugs into a store that already holds Post entities.
export function withPostLoading() {
  return signalStoreFeature(
    { state: type<EntityState<Post>>() },
    withRequestStatus(),
    withMethods((store, postsApi = inject(PostsApi)) => ({
      async loadAll(): Promise<void> {
        patchState(store, setPending());
        try {
          const posts = await firstValueFrom(postsApi.fetchAll());
          // two updaters, one state change
          patchState(store, setAllEntities(posts), setFulfilled());
        } catch (error) {
          patchState(store, setError(String(error)));
        }
      },
    })),
  );
}
