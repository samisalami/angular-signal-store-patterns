import { computed, inject } from '@angular/core';
import { signalStore, withComputed } from '@ngrx/signals';
import { setAllEntities, setEntity, withEntities } from '@ngrx/signals/entities';
import { Events, on, withEventHandlers, withReducer } from '@ngrx/signals/events';
import { catchError, EMPTY, exhaustMap, ignoreElements, map, mergeMap, of } from 'rxjs';
import { Post } from '../../01-domain-functions/a-companion-object/post';
import { PostsApi } from '../../shared/posts-api';
import { setError, setFulfilled, setPending, withRequestStatus } from '../../shared/with-request-status';
import { postsApiEvents, postsViewEvents } from './posts.events';

// Option E: the store has no methods. It reacts to events.
// What was one method in options A-D is now three pieces: an event (posts.events.ts),
// a reducer case (the state change) and an event handler (the server call).
// Reading the store is unchanged: same state, same computeds.
export const PostsStore = signalStore(
  { providedIn: 'root' },
  withEntities<Post>(),
  withRequestStatus(),
  withComputed(({ entities }) => ({
    publishedPosts: computed(() => entities().filter((post) => !Post.isDraft(post))),
    drafts: computed(() => entities().filter((post) => Post.isDraft(post))),
  })),

  // State changes: pure functions, no DI, nothing async. Event and state in, state change out.
  withReducer(
    on(postsViewEvents.opened, postsViewEvents.retryClicked, () => setPending()),
    on(postsApiEvents.loaded, ({ payload: posts }) => [setAllEntities(posts), setFulfilled()]),
    on(postsApiEvents.loadFailed, ({ payload: error }) => setError(error)),
    // Liking and taking a rejected like back are the same update: toggle it.
    on(postsViewEvents.likeToggled, postsApiEvents.likeRejected, ({ payload }, state) => {
      const post = state.entityMap[payload.postId];
      return post ? setEntity(Post.toggleLike(post, payload.user)) : {};
    }),
  ),

  // Side effects: hear an event, talk to the server, answer with another event.
  withEventHandlers((store, events = inject(Events), postsApi = inject(PostsApi)) => ({
    loadPosts$: events.on(postsViewEvents.opened, postsViewEvents.retryClicked).pipe(
      // exhaustMap -> clicks while a load is running are ignored
      exhaustMap(() =>
        postsApi.fetchAll().pipe(
          map((posts) => postsApiEvents.loaded(posts)),
          catchError((error) => of(postsApiEvents.loadFailed(String(error)))),
        ),
      ),
    ),

    saveLike$: events.on(postsViewEvents.likeToggled).pipe(
      mergeMap(({ payload }) => {
        // reducers run before event handlers, so the store already holds the toggled post
        const toggledPost: Post | undefined = store.entityMap()[payload.postId];
        if (!toggledPost) {
          return EMPTY;
        }
        return postsApi.updateLikes(payload.postId, toggledPost.likedBy).pipe(
          ignoreElements(),
          catchError(() => of(postsApiEvents.likeRejected(payload))),
        );
      }),
    ),
  })),
);
