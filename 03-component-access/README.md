# 3. Component access

How a component gets what it needs from several stores and services. Every option builds the same post card:

- shows a post
- shows whether the signed-in user liked it, and toggles the like (anonymous users are sent to sign in)
- shows an Edit button only if the user may edit the post, and navigates to the editor

That needs `PostsStore`, `SessionStore`, `Router` and the `Post` domain rules. All options use the store from [`02-store-organisation/c-store-features`](../02-store-organisation/c-store-features/), except B, which needs its own.

| Option | Folder | Verdict |
|---|---|---|
| A: logic in the component | [`a-logic-in-component/`](a-logic-in-component/) | fine for a one-off |
| B: view methods on the store | [`b-store-view-methods/`](b-store-view-methods/) | avoid |
| C: component-provided service | [`c-component-service/`](c-component-service/) | works, more ceremony |
| D: inject function | [`d-inject-function/`](d-inject-function/) | **recommended** |

## Option A: logic in the component

[`a-logic-in-component/post-card.component.ts`](a-logic-in-component/post-card.component.ts) injects both stores and the router and builds every `computed` itself.

Perfectly fine for one component. But the post detail page and the post list row need the same `isLiked` / `canEdit` / `toggleLike` logic, and the choices then are copy and paste or a base class.

## Option B: view methods on the store

[`b-store-view-methods/posts.store.ts`](b-store-view-methods/posts.store.ts) answers the view's questions itself: `isLikedByViewer(postId)`, `canViewerEdit(postId)`, `toggleLikeAsViewer(postId)`, `editPost(postId)`.

The component becomes thin, but:

- `PostsStore` now depends on `SessionStore` and `Router`. A state container knows about navigation.
- Every screen adds its own "from the viewer's point of view" methods, and the store grows view logic for all of them.
- The template passes `postId()` into every call.

## Option C: component-provided service

[`c-component-service/post-view.service.ts`](c-component-service/post-view.service.ts) holds the same logic as option D in an `@Injectable()` class. The component provides it (`providers: [PostViewService]`), so each card gets its own instance.

It works, but a class needs ceremony that a function doesn't:

- a `providers` entry on every component that uses it
- the service can't see the component's `input()`, so it needs a `connect(postId)` bridge and an internal "signal of a signal"
- every method has to handle "not connected yet"

## Option D: inject function (recommended)

An inject function is a plain function that calls `inject()`, builds `computed`s and returns signals plus actions. It is the closest Angular has to a Vue composable or a React hook. By convention its name starts with `inject`, like `injectQueryParams` in ngxtension.

[`d-inject-function/inject-post.ts`](d-inject-function/inject-post.ts):

```ts
export function injectPost(postId: Signal<string>) {
  const postsStore = inject(PostsStore);
  const sessionStore = inject(SessionStore);
  const router = inject(Router);

  const post = computed<Post | undefined>(() => postsStore.entityMap()[postId()]);

  const isLiked = computed(() => {
    const currentPost = post();
    const viewer = sessionStore.currentUser();
    return currentPost !== undefined && viewer !== null && Post.isLikedBy(currentPost, viewer);
  });

  // canEdit, likeCount…

  return {
    post,
    isLiked,
    canEdit,
    likeCount,

    toggleLike(): void {
      const viewer = sessionStore.currentUser();
      if (viewer === null) {
        void router.navigate(['/sign-in']);
        return;
      }
      void postsStore.toggleLike(postId(), viewer);
    },

    edit(): void {
      void router.navigate(['/posts', postId(), 'edit']);
    },
  };
}
```

[`d-inject-function/post-card.component.ts`](d-inject-function/post-card.component.ts):

```ts
export class PostCardComponent {
  readonly postId = input.required<string>();

  protected readonly postView = injectPost(this.postId);
}
```

The component doesn't know that two stores exist, that liking is optimistic, or who may edit a post. A detail page gets the same behaviour with the same one line. The argument is a `Signal`, so `postView` follows a changing `postId` without any bridge.

Compared with the others:

- vs. A: the logic is written once and reused.
- vs. B: stores stay state containers. The view's perspective lives with the view and is created and destroyed with each component.
- vs. C: no `providers` entry and no `connect()`. The input signal is just an argument.

### Rules

- Call it only in an injection context: a field initializer or the constructor. Not in `ngOnInit`, not in event handlers.
- Take inputs as `Signal`s, not plain values, so the result stays reactive.
- Return signals and functions, never writable state. Changes go through the stores.
- Use `DestroyRef` for cleanup (intervals, subscriptions). It is tied to the calling component.
- Don't write one for a single pass-through. If a component only needs `postsStore.drafts()`, inject the store.
