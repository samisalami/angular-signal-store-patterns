# Angular Signal Store Patterns

Where does the functional code around an NgRx Signal Store go, if not into the store itself and not into a `helpers/` folder?

Vue has composables, React has hooks. Angular with NgRx Signal Store splits the same idea into three layers. Which layer a piece of code belongs in depends on what it needs:

| The code needs… | Pattern | Lives in | Vue / React analogue |
|---|---|---|---|
| nothing but your data | [Domain functions](docs/01-domain-functions.md) | next to the type: `post.ts` | a plain TS module |
| store state, methods or lifecycle | [Store features](docs/02-store-features.md) (`withX()`) | next to the store: `store/with-post-likes.ts` | a composable used inside a store |
| DI, used by components | [Inject functions](docs/03-inject-functions.md) (`injectX()`) | next to the domain: `inject-post.ts` | a composable / hook |

The store file itself only composes these pieces, so it stays short:

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

"Helpers" stays reserved for code that knows nothing about your domain: strings, arrays, dates.

## The example

A small blog: **posts** that signed-in **users** can like, and that their authors (or admins) can edit.

```
src/
  users/
    user.ts                        // User type + domain functions
    session.store.ts               // who is signed in
  posts/
    post.ts                        // Post type + domain functions (isDraft, isEditableBy, toggleLike…)
    post.spec.ts                   // plain unit tests, no TestBed
    posts-api.ts                   // HTTP
    store/
      posts.store.ts               // composition only
      with-post-loading.ts         // feature: load posts + request status
      with-post-likes.ts           // feature: optimistic like with rollback
    inject-post.ts                 // inject function: one post, from the viewer's point of view
    post-card.component.ts         // consumes injectPost(), knows no store
  shared/
    store-features/
      with-request-status.ts       // generic feature + partial state updaters
```

## Choosing a layer

1. **Can it be written without importing anything from `@angular` or `@ngrx`?** -> domain function. Most of the logic should land here, and it is the cheapest code to test.
2. **Does it read or change store state, or need store lifecycle?** -> store feature. Split one out when it is a cohesive slice (loading, likes, selection, pagination), not to move a two-line method into another file.
3. **Does a component need to combine stores, router or other services into one view?** -> inject function.

## Running

```bash
npm install
npm test           # domain function tests (vitest)
npm run typecheck  # tsc over all examples
```

Targets Angular 21 and `@ngrx/signals` 21. `withFeature` (used in the store features doc) needs `@ngrx/signals` 20 or newer.
