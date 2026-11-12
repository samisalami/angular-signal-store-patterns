# 2. Store organisation

How to keep a store from growing into one long file. Options A to D build the same `PostsStore` with the same methods. They differ only in where the code sits. Option E changes how the store is driven: events instead of methods.

| Option | Folder | Verdict |
|---|---|---|
| A: everything inline | [`a-inline-store/`](a-inline-store/) | fine while the store has one concern |
| B: method factories | [`b-method-factories/`](b-method-factories/) | avoid |
| C: store features | [`c-store-features/`](c-store-features/) | **recommended** |
| D: features with callbacks | [`d-feature-callbacks/`](d-feature-callbacks/) | C plus `withFeature`, for generic features |
| E: events | [`e-events/`](e-events/) | when methods stop being enough: several stores or components react to the same thing |
| How the store is used | [`usage/`](usage/) | one component, and one spec that runs against A to D |

## What is on the store

This is the whole public API, identical in options A to D:

| Member | Kind | What it is |
|---|---|---|
| `entityMap`, `ids`, `entities` | state | the posts, from `withEntities<Post>()` |
| `requestStatus` | state | `'idle' \| 'pending' \| 'fulfilled' \| { error }` |
| `isPending`, `isFulfilled`, `error` | computed | readable views of `requestStatus` |
| `publishedPosts`, `drafts` | computed | the posts, split with `Post.isDraft` |
| `loadAll()` | method | fetch all posts; also runs once when the store is created |
| `toggleLike(postId, user)` | method | like or unlike as `user`: optimistic, rolled back if the server rejects it |

Two methods. A store has few of them, because a method is only for **changing state or talking to the server**. Everything else on the list is state or derived state, and everything about *who is looking* or *which screen* is not on the store at all (see [chapter 3](../03-component-access/)).

What the methods have in common:

- **They are named for what happens to posts**: `loadAll`, `toggleLike`. As the app grows: `createPost`, `deletePost`, `publish`.
- **The actor is an argument.** `toggleLike(postId, user)` does not look up who is signed in. The store knows nothing about sessions, and a test can like a post as anyone.
- **The rule comes from a domain function.** `toggleLike` asks `Post.toggleLike(post, user)` what the new post is and only adds saving, the server call and the rollback.

And what the computeds have in common: **no parameters**. `drafts()` is a fact about the store's state. "Is this post liked by that user" needs two parameters, so it is not a store computed.

## How the store is used

A store is used through its signals and methods, nothing else. That is why options A to D are interchangeable.

**From a component:** [`usage/posts-overview.component.ts`](usage/posts-overview.component.ts) injects the store, reads signals in the template and calls a method from a button:

```ts
@Component({
  selector: 'app-posts-overview',
  template: `
    @if (postsStore.isPending()) {
      <p>Loading posts…</p>
    }

    @if (postsStore.error(); as error) {
      <p role="alert">Could not load posts: {{ error }}</p>
      <button type="button" (click)="postsStore.loadAll()">Retry</button>
    }

    @if (postsStore.isFulfilled()) {
      <p>{{ postsStore.publishedPosts().length }} published, {{ postsStore.drafts().length }} drafts</p>
    }
  `,
})
export class PostsOverviewComponent {
  protected readonly postsStore = inject(PostsStore);
}
```

Nothing sits between the store and the template, because this view needs nothing the store doesn't already offer. This is the default. Chapter 3 is about the views where it isn't enough.

**From a test:** [`usage/posts-store.spec.ts`](usage/posts-store.spec.ts) runs one suite against options A to D with `describe.each`. It replaces `PostsApi` with a fake and then does what any consumer does:

```ts
it('should take the like back when the server rejects it', async () => {
  postsApi.updateLikes.mockReturnValue(throwError(() => SERVER_ERROR_LABEL));
  const postsStore = TestBed.inject(PostsStore);
  await vi.waitFor(() => expect(postsStore.isFulfilled()).toBe(true));

  await postsStore.toggleLike(PUBLISHED_POST_ID, reader);

  expect(postsStore.entityMap()[PUBLISHED_POST_ID].likedBy).toEqual([]);
});
```

The shared spec is also what keeps the options honest. When it was first written, it failed to compile for option A: the inline store had forgotten `isFulfilled`, which the feature-based options get for free from `withRequestStatus()`. That is the cost of option A in one example.

## Option A: everything inline

[`a-inline-store/posts.store.ts`](a-inline-store/posts.store.ts) puts state, computeds, both methods and the hook into one `signalStore(...)` call.

At this size it reads fine. It stops scaling once unrelated concerns (loading, likes, selection, filters, pagination) share one `withComputed` and one `withMethods` block. The request status logic is also written out by hand, so every store that loads something repeats it, and can get it slightly wrong.

## Option B: method factories

The method bodies move into their own files, and the store wires them up:

```ts
withMethods((store, postsApi = inject(PostsApi)) => ({
  loadAll: createLoadAll(store, postsApi),
  toggleLike: createToggleLike(store, postsApi),
})),
```

It looks like a clean split, but `createLoadAll(store, …)` needs the store's type as a parameter. NgRx only knows that type *after* the store is built, so it has to be written by hand in [`b-method-factories/posts-store-internals.ts`](b-method-factories/posts-store-internals.ts):

```ts
export type PostsStoreInternals = WritableStateSource<EntityState<Post> & RequestStatusState> & {
  entityMap: Signal<EntityMap<Post>>;
};
```

Nothing keeps that type in sync with the store. Add a computed to the store and want to use it in a factory? Update the type by hand. The factories are also tied to this one store, so they can't be reused anywhere else.

## Option C: store features (recommended)

A store feature (`signalStoreFeature`) is a reusable slice of a store: state, computeds, methods and hooks under one `withX()` name. NgRx extends stores the same way itself (`withEntities`, `withDevtools`).

[`c-store-features/`](c-store-features/) splits by concern:

- [`with-post-loading.ts`](c-store-features/with-post-loading.ts): `loadAll()`, plus the generic [`withRequestStatus()`](../shared/with-request-status.ts)
- [`with-post-likes.ts`](c-store-features/with-post-likes.ts): optimistic `toggleLike()`
- [`posts.store.ts`](c-store-features/posts.store.ts): composition only

```ts
export const PostsStore = signalStore(
  { providedIn: 'root' },
  withEntities<Post>(),
  withPostLoading(),
  withPostLikes(),
  withComputed(({ entities }) => ({
    publishedPosts: computed(() => entities().filter((post) => !Post.isDraft(post))),
    drafts: computed(() => entities().filter((post) => Post.isDraft(post))),
  })),
  withHooks({
    onInit(store) {
      void store.loadAll();
    },
  }),
);
```

```ts
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
```

`{ state: type<EntityState<Post>>() }` is a typed contract. The feature declares what it needs from its host store, and NgRx reports a compile error if the host doesn't have it. It is option B done right: the split is typed by NgRx instead of by hand.

## Option D: features that receive callbacks

Some features shouldn't know any store shape at all, just "call this every minute". [`d-feature-callbacks/with-auto-refresh.ts`](d-feature-callbacks/with-auto-refresh.ts) takes a plain callback, and `withFeature` (NgRx 20+) passes it a member of the store built so far:

```ts
withFeature((store) => withAutoRefresh(() => void store.loadAll(), 60_000)),
```

Use this for generic features (auto refresh, undo history, persistence) that should work in any store.

## Option E: events, when methods stop being enough

With methods, the caller tells the store what to do: `postsStore.toggleLike(postId, user)`. That works as long as each action has one place that reacts to it.

It stops working when **several stores or components react to the same thing**. Say a rejected like has three consequences:

1. the post goes back to how it was
2. a notification appears
3. the like button that was clicked shows "Could not save your like"

With methods, whoever notices the failure has to call all three. `PostsStore` would need to know `NotificationsStore`, and there is no clean way for a store to reach one button. Every new consequence means editing the sender.

The Events plugin (`@ngrx/signals/events`) turns it around. The sender only announces what happened, and everyone interested reacts on their own. It is still a `signalStore` with the same state and computeds. What changes is that the methods are replaced by three pieces:

| Piece | What it is | In [`e-events/`](e-events/) |
|---|---|---|
| **Event** | a named fact with a payload | [`posts.events.ts`](e-events/posts.events.ts): `likeToggled`, `loaded`, `likeRejected`… |
| **Reducer** (`withReducer`) | pure: event and state in, state change out | [`posts.store.ts`](e-events/posts.store.ts) |
| **Event handler** (`withEventHandlers`) | side effects: hears an event, calls the server, answers with another event | [`posts.store.ts`](e-events/posts.store.ts) |

```ts
withReducer(
  on(postsViewEvents.opened, postsViewEvents.retryClicked, () => setPending()),
  on(postsApiEvents.loaded, ({ payload: posts }) => [setAllEntities(posts), setFulfilled()]),
  on(postsApiEvents.loadFailed, ({ payload: error }) => setError(error)),
  // Liking and taking a rejected like back are the same transition: toggle it.
  on(postsViewEvents.likeToggled, postsApiEvents.likeRejected, ({ payload }, state) => {
    const post = state.entityMap[payload.postId];
    return post ? setEntity(Post.toggleLike(post, payload.user)) : {};
  }),
),
```

The domain function and the state updaters are the same ones options A to D use. Only the trigger is different.

### Three reactions to one event

`postsApiEvents.likeRejected` is dispatched once, by the event handler that talks to the server. Three places react, and none of them knows the others:

| Who reacts | How | What it does |
|---|---|---|
| [`PostsStore`](e-events/posts.store.ts) | reducer | toggles the like back |
| [`NotificationsStore`](e-events/notifications.store.ts) | reducer | adds "Your like could not be saved." |
| [`PostLikeButtonComponent`](e-events/post-like-button.component.ts) | `inject(Events).on(…)` | shows a hint next to the button that was clicked |

The second store is nothing but a reducer:

```ts
export const NotificationsStore = signalStore(
  { providedIn: 'root' },
  withState<{ messages: string[] }>({ messages: [] }),
  withReducer(
    on(postsApiEvents.loadFailed, ({ payload: error }, state) => ({
      messages: [...state.messages, `Could not load posts: ${error}`],
    })),
    on(postsApiEvents.likeRejected, (_, state) => ({
      messages: [...state.messages, 'Your like could not be saved.'],
    })),
  ),
);
```

And a component can listen directly, for reactions that are not state. The hint belongs to one button for a moment, so no store should hold it:

```ts
constructor() {
  inject(Events)
    .on(postsApiEvents.likeRejected)
    .pipe(
      filter(({ payload }) => payload.postId === this.post().id),
      takeUntilDestroyed(),
    )
    .subscribe(() => this.wasRejected.set(true));
}
```

Every like button on the page runs this, each for its own post. Adding a fourth reaction (an analytics store, say) means adding one `on(…)` somewhere. Nothing that dispatches changes.

### Using it from a view

Reading is unchanged. Writing becomes dispatching ([`posts-overview.component.ts`](e-events/posts-overview.component.ts)):

```ts
export class PostsOverviewComponent {
  protected readonly postsStore = inject(PostsStore);
  protected readonly notificationsStore = inject(NotificationsStore);
  protected readonly dispatch = injectDispatch(postsViewEvents);

  constructor() {
    this.dispatch.opened();
  }
}
```

```html
<button type="button" (click)="dispatch.retryClicked()">Retry</button>
```

Events are named as facts in the past tense (`opened`, `retryClicked`, `likeToggled`), not as commands (`loadPosts`). The view doesn't decide that opening means loading. The store does.

The other layers don't change. Domain functions fit even better, because `Post.toggleLike` goes straight into a reducer. In chapter 3, `injectPostLike` would call `dispatch.likeToggled({ postId, user })` instead of `postsStore.toggleLike(postId, user)`. Features still apply: a `withPostLikes()` feature would bundle the reducer case and the handler for liking.

### What it costs

- **More code and more jumping around.** One `toggleLike` method became two event definitions, a reducer case and a handler. Following a click means going from the dispatch to the events file to the reducer to the handler.
- **RxJS is back.** Options A to D use `async`/`await`. Event handlers are observables, and you need to pick the right operator (`exhaustMap`, `mergeMap`).
- **No return value.** `await postsStore.toggleLike(…)` tells the caller when it's done. A dispatched event tells the caller nothing. It has to watch state, or listen for the answering event.
- **A store only hears events while it exists.** `NotificationsStore` is created the first time something injects it. Events dispatched before that are gone.
- **Order matters in one place.** Reducers run before event handlers. `saveLike$` relies on that to read the already toggled post.

[`e-events/posts-store.spec.ts`](e-events/posts-store.spec.ts) covers the same behaviour as the shared spec for A to D, plus the second store's reactions.

### When to switch

Stay with methods (option C) by default. They are shorter, they can be followed with "go to definition", and callers can `await` them.

Move a store to events when one of these is true:

- **Several stores or components must react to the same thing**, and the sender would otherwise have to know all of them.
- A reaction is needed in a place the sender can't reach, like one specific component instance.
- You need a record of everything that happened, for debugging or auditing.

It's a per-store decision. An app can have most stores on methods and one busy store on events.

## When to split a feature out

Use the two tests from [Where does it go?](../WHERE-DOES-IT-GO.md#what-is-one-concern):

- **The delete test.** "If the product dropped liking, which lines would go?" With option C the answer is one file, `with-post-likes.ts`. With option A it is a method here and, as the store grows, state and computeds scattered between the others.
- **The usage test** applies to generic features: a second store needs it (request status, auto refresh, undo history) -> it becomes a shared feature.

A store with a single concern stays one `signalStore(...)` call. Don't split out a two-line method just to shorten the file: many tiny features are harder to follow than one medium store.

## Partial state updaters vs. methods

[`shared/with-request-status.ts`](../shared/with-request-status.ts) exports `setPending()`, `setFulfilled()` and `setError()` as plain functions next to the feature, instead of adding them as methods:

```ts
patchState(store, setAllEntities(posts), setFulfilled());
```

The method version would be:

```ts
patchState(store, setAllEntities(posts));
store.setFulfilled();
```

Why the exported functions are better:

1. **They compose into one state change.** One `patchState` with two updaters is one transition. With methods it is two: between them the posts are loaded but the status still says `pending`. `watchState` and the Redux DevTools see that half-finished state as its own step.
2. **They don't become public store API.** Every method is callable by whoever injects the store, so any component could call `postsStore.setError('nope')`. Updaters only work through `patchState`, and with `protectedState` (on by default) only the store itself can patch its state. A private `_setPending` method would hide it as well, but it still wouldn't compose (point 1).
3. **They work in every store with the feature.** `setPending()` describes a change to the `requestStatus` slice, not to one particular store. NgRx's entities work the same way: `withEntities()` is the feature, and `setAllEntities`, `setEntity` and `updateEntity` are exported updaters.
4. **They are pure.** Data in, partial state out. Testable without a store.

They live outside the `signalStore(...)` call because they are not part of a store instance. They describe a state shape, just as domain functions describe a data type. They still belong to the feature, so they sit in the feature's file.

### Rule of thumb

- **Methods** are what callers can ask the store to do: `loadAll()`, `toggleLike(postId, user)`. They change state or talk to the server.
- **Updaters** are how the state changes: `setPending()`, `setEntity(post)`. Pure transitions of the *state*, used inside methods.
- **Domain functions** are what the data means: `Post.toggleLike(post, user)`. Pure transitions of the *entity*, used inside methods.

`withPostLikes` shows all three together. `Post.toggleLike` decides the new post, `setEntity` turns it into a state change, and the method adds the optimistic update and the server call.
