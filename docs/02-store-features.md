# 2. Store features

A store feature (`signalStoreFeature`) is a reusable slice of a store: state, computeds, methods and hooks, bundled under one `withX()` name. It is how NgRx itself extends stores (`withEntities`, `withDevtools`). It is also the answer to "our stores are getting too long".

## Options for organising store code

### Option A: everything inline in `signalStore(...)`

```ts
export const PostsStore = signalStore(
  withEntities<Post>(),
  withState<{ requestStatus: RequestStatus }>({ requestStatus: 'idle' }),
  withMethods((store, postsApi = inject(PostsApi)) => ({
    async loadAll(): Promise<void> { /* … */ },
    async toggleLike(postId: string, user: User): Promise<void> { /* … */ },
    // …and 15 more
  })),
);
```

Fine for small stores. It stops scaling once unrelated concerns (loading, likes, selection, filters) share one `withMethods` block.

### Option B: method factories in other files (avoid)

```ts
withMethods((store) => ({
  loadAll: createLoadAll(store),
  toggleLike: createToggleLike(store),
}));
```

It looks like a split, but `createLoadAll(store)` needs the store's type as a parameter, and that type only exists *after* the store is built. You end up hand-writing `{ entityMap: Signal<…>; ids: Signal<…> } & WritableStateSource<…>` and keeping it in sync by hand.

### Option C: store features (used in this repo)

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

The `{ state: type<EntityState<Post>>() }` input is a typed contract. The feature declares what it needs from its host store, and NgRx gives a compile error if you plug it into a store without Post entities. That is Option B done right: the split is typed by NgRx, not by hand.

### Option D: features that receive callbacks (`withFeature`, NgRx 20+)

When a feature needs to *call* something on the host store but shouldn't know the store's shape, pass it a function:

```ts
export function withAutoRefresh(refresh: () => void, intervalMs: number) {
  return signalStoreFeature(
    withHooks({
      onInit() {
        const intervalId = setInterval(refresh, intervalMs);
        inject(DestroyRef).onDestroy(() => clearInterval(intervalId));
      },
    }),
  );
}
```

```ts
export const PostsStore = signalStore(
  withEntities<Post>(),
  withPostLoading(),
  withFeature((store) => withAutoRefresh(() => store.loadAll(), 60_000)),
);
```

## Partial state updaters vs. methods

`with-request-status.ts` exports `setPending()`, `setFulfilled()` and `setError()` as plain functions next to the feature, instead of adding them as methods:

```ts
export function setPending(): { requestStatus: RequestStatus } {
  return { requestStatus: 'pending' };
}
```

```ts
patchState(store, setAllEntities(posts), setFulfilled());
```

The method version would be:

```ts
withMethods((store) => ({
  setPending(): void {
    patchState(store, { requestStatus: 'pending' });
  },
  setFulfilled(): void {
    patchState(store, { requestStatus: 'fulfilled' });
  },
}));
```

```ts
patchState(store, setAllEntities(posts));
store.setFulfilled();
```

Why the exported functions are better:

1. **They compose into one state change.** `patchState(store, setAllEntities(posts), setFulfilled())` is one transition. With methods it is two: between them the posts are loaded but the status still says `pending`. `watchState` and the Redux DevTools see that half-finished state as its own step.
2. **They don't become public store API.** Every method is callable by whoever injects the store, so any component could call `postsStore.setError('nope')`. Updaters only work through `patchState`, and with `protectedState` (on by default) only the store itself can patch its state. The store keeps sole control over its transitions. A `_setPending` private method would hide it as well, but it still wouldn't compose (point 1).
3. **They work in every store with the feature.** `setPending()` describes a change to the `requestStatus` slice, not to a particular store. Every store that uses `withRequestStatus()` can use it. NgRx's own entities work the same way: `withEntities()` is the feature, and `setAllEntities`, `setEntity`, `updateEntity`, `removeEntity` are exported updaters.
4. **They are pure.** Data in, partial state out. Testable without a store.

They live *outside* the `signalStore(...)` call because they are not part of a store instance. They describe a state shape, just like domain functions describe a data type. They still belong to the feature, so they go in the feature's file.

### Rule of thumb

- **Methods** are what callers can ask the store to do: `loadAll()`, `toggleLike(postId, user)`. Verbs with intent, often with side effects and DI.
- **Updaters** are how the state changes: `setPending()`, `setEntity(post)`. Pure transitions, used inside methods.
- **Domain functions** are what the data means: `Post.toggleLike(post, user)`. Used by both of the above.

`withPostLikes` shows all three together. `Post.toggleLike` decides the new post, `setEntity` turns it into a state change, and the `toggleLike` method adds the optimistic update and the server call around it.

## When to split a feature out

- It is a cohesive concern with its own state or its own methods: loading, likes, selection, pagination, filters.
- Or it is reusable across stores: request status, auto refresh, undo history.

Don't split out a single two-line method just to make the store file shorter. Lots of tiny features are harder to read than one medium store.
