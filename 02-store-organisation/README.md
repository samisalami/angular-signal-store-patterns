# 2. Store organisation

How to keep a store from growing into one long file. All four options build the same `PostsStore`: posts as entities, a request status, `loadAll()`, an optimistic `toggleLike()` with rollback, and `publishedPosts` / `drafts`.

| Option | Folder | Verdict |
|---|---|---|
| A: everything inline | [`a-inline-store/`](a-inline-store/) | fine while the store is small |
| B: method factories | [`b-method-factories/`](b-method-factories/) | avoid |
| C: store features | [`c-store-features/`](c-store-features/) | **recommended** |
| D: features with callbacks | [`d-feature-callbacks/`](d-feature-callbacks/) | C plus `withFeature`, for generic features |

## Option A: everything inline

[`a-inline-store/posts.store.ts`](a-inline-store/posts.store.ts) puts state, computeds, both methods and the hook into one `signalStore(...)` call.

At this size it reads fine. It stops scaling once unrelated concerns (loading, likes, selection, filters, pagination) share one `withComputed` and one `withMethods` block. The request status logic is also written out by hand, so every store that loads something repeats it.

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

- **Methods** are what callers can ask the store to do: `loadAll()`, `toggleLike(postId, user)`. Verbs with intent, often with side effects and DI.
- **Updaters** are how the state changes: `setPending()`, `setEntity(post)`. Pure transitions, used inside methods.
- **Domain functions** are what the data means: `Post.toggleLike(post, user)`. Used by both.

`withPostLikes` shows all three together. `Post.toggleLike` decides the new post, `setEntity` turns it into a state change, and the method adds the optimistic update and the server call.

## When to split a feature out

- It is a cohesive concern with its own state or methods: loading, likes, selection, pagination, filters.
- Or it is reusable across stores: request status, auto refresh, undo history.

Don't split out a two-line method just to shorten the store file. Many tiny features are harder to follow than one medium store.
