import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { setAllEntities, setEntity, withEntities } from '@ngrx/signals/entities';
import { firstValueFrom } from 'rxjs';
import { Post } from '../../01-domain-functions/a-companion-object/post';
import { PostsApi } from '../../shared/posts-api';
import { User } from '../../shared/user';
import { RequestStatus } from '../../shared/with-request-status';

// Option A: everything in one signalStore(...) call.
// Same behaviour as option C, no features. Readable at this size; every new concern
// (selection, filters, pagination…) lands in the same withComputed / withMethods blocks.
export const PostsStore = signalStore(
  { providedIn: 'root' },
  withEntities<Post>(),
  withState<{ requestStatus: RequestStatus }>({ requestStatus: 'idle' }),
  withComputed(({ entities, requestStatus }) => ({
    isPending: computed(() => requestStatus() === 'pending'),
    isFulfilled: computed(() => requestStatus() === 'fulfilled'),
    error: computed(() => {
      const status = requestStatus();
      return typeof status === 'object' ? status.error : null;
    }),
    publishedPosts: computed(() => entities().filter((post) => !Post.isDraft(post))),
    drafts: computed(() => entities().filter((post) => Post.isDraft(post))),
  })),
  withMethods((store, postsApi = inject(PostsApi)) => ({
    async loadAll(): Promise<void> {
      patchState(store, { requestStatus: 'pending' });
      try {
        const posts = await firstValueFrom(postsApi.fetchAll());
        patchState(store, setAllEntities(posts), { requestStatus: 'fulfilled' });
      } catch (error) {
        patchState(store, { requestStatus: { error: String(error) } });
      }
    },

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
  withHooks({
    onInit(store) {
      void store.loadAll();
    },
  }),
);
