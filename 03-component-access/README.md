# 3. Component access

How a component gets what it needs from several stores and services. Every option builds the same post card:

- shows a post
- shows whether the signed-in user liked it, and toggles the like (anonymous users are sent to sign in)
- shows an Edit button only if the user may edit the post, and navigates to the editor

That needs `PostsStore`, `SessionStore`, `Router` and the `Post` domain rules. Option D adds two more views (a feed row and a moderation row) to show how the pattern behaves as views multiply. All options use the store from [`02-store-organisation/c-store-features`](../02-store-organisation/c-store-features/), except B, which needs its own.

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

[`c-component-service/post-view.service.ts`](c-component-service/post-view.service.ts) holds the same logic as option D's two inject functions, combined in one `@Injectable()` class. The component provides it (`providers: [PostViewService]`), so each card gets its own instance.

It works, but a class needs ceremony that a function doesn't:

- a `providers` entry on every component that uses it
- the service can't see the component's `input()`, so it needs a `connect(postId)` bridge and an internal "signal of a signal"
- every method has to handle "not connected yet"

## Option D: inject function (recommended)

An inject function is a plain function that calls `inject()`, builds `computed`s and returns signals plus actions. It is the closest Angular has to a Vue composable or a React hook. By convention its name starts with `inject`, like `injectQueryParams` in ngxtension.

### One inject function per concern, not per view

The tempting version is one big `injectPost()` that returns everything any post view might need. That only moves the problem: the store stays small, but `injectPost` now grows with every new view instead. The only gain is that the growth sits in a different file.

So split by **concern**. A concern is something several views need: liking a post, what the user may do with a post. Each view then takes the concerns it shows. [`d-inject-function/`](d-inject-function/) has two inject functions and three views:

| View | Shows | Uses |
|---|---|---|
| [`post-card.component.ts`](d-inject-function/post-card.component.ts) | post, like button, edit button | `injectPostLike` + `injectPostPermissions` |
| [`post-list-row.component.ts`](d-inject-function/post-list-row.component.ts) | title, like button | `injectPostLike` |
| [`moderation-row.component.ts`](d-inject-function/moderation-row.component.ts) | title, draft flag, edit button | `injectPostPermissions` |

Three views, two inject functions. A fourth view (a post detail page, say) usually adds nothing new. The number of inject functions grows with the concerns in your domain, not with your screens:

- a new **view** -> combine existing inject functions
- a new **permission** (delete, publish) -> extend `injectPostPermissions`
- a new **concern** that several views share (bookmarking, say) -> a new `injectPostBookmark`

[`d-inject-function/inject-post-like.ts`](d-inject-function/inject-post-like.ts):

```ts
export function injectPostLike(postId: Signal<string>) {
  const postsStore = inject(PostsStore);
  const sessionStore = inject(SessionStore);
  const router = inject(Router);

  const post = computed<Post | undefined>(() => postsStore.entityMap()[postId()]);

  const isLiked = computed(() => {
    const currentPost = post();
    const viewer = sessionStore.currentUser();
    return currentPost !== undefined && viewer !== null && Post.isLikedBy(currentPost, viewer);
  });

  const likeCount = computed(() => post()?.likedBy.length ?? 0);

  return {
    isLiked,
    likeCount,

    toggleLike(): void {
      const viewer = sessionStore.currentUser();
      if (viewer === null) {
        void router.navigate(['/sign-in']);
        return;
      }
      void postsStore.toggleLike(postId(), viewer);
    },
  };
}
```

[`d-inject-function/inject-post-permissions.ts`](d-inject-function/inject-post-permissions.ts):

```ts
export function injectPostPermissions(postId: Signal<string>) {
  const postsStore = inject(PostsStore);
  const sessionStore = inject(SessionStore);
  const router = inject(Router);

  const canEdit = computed(() => {
    const currentPost: Post | undefined = postsStore.entityMap()[postId()];
    const viewer = sessionStore.currentUser();
    return currentPost !== undefined && viewer !== null && Post.isEditableBy(currentPost, viewer);
  });

  return {
    canEdit,

    edit(): void {
      void router.navigate(['/posts', postId(), 'edit']);
    },
  };
}
```

Each view picks what it shows:

```ts
export class PostCardComponent {
  readonly postId = input.required<string>();

  private readonly postsStore = inject(PostsStore);

  protected readonly post = computed<Post | undefined>(() => this.postsStore.entityMap()[this.postId()]);
  protected readonly like = injectPostLike(this.postId);
  protected readonly permissions = injectPostPermissions(this.postId);
}

export class PostListRowComponent {
  readonly postId = input.required<string>();

  private readonly postsStore = inject(PostsStore);

  protected readonly post = computed<Post | undefined>(() => this.postsStore.entityMap()[this.postId()]);
  protected readonly like = injectPostLike(this.postId);
}
```

Three more things these views show:

- **Plain reads stay plain.** Reading the post itself is one store lookup, so the views inject `PostsStore` directly. No inject function needed.
- **Logic only one view needs stays in that view.** The moderation row's `isDraft` is a `computed` over `Post.isDraft` in the component. Extract it only when a second view needs it.
- **Inject functions don't depend on each other's results.** Each derives what it needs from the stores, so a view can take any combination.

The thing to avoid is the "view model per component" habit: `injectPostCardViewModel()`, `injectPostListRowViewModel()`… That only moves each component's code into a second file. It's the same trap as option C's per-component service, just written as a function.

### Compared with the other options

- vs. A: shared logic is written once and reused, and view-specific logic still stays in the view.
- vs. B: stores stay state containers. The view's perspective lives with the views and is created and destroyed with each component.
- vs. C: no `providers` entry and no `connect()`. The input signal is just an argument, and a view combines several inject functions without nesting services.

### Rules

- Call it only in an injection context: a field initializer or the constructor. Not in `ngOnInit`, not in event handlers.
- Take inputs as `Signal`s, not plain values, so the result stays reactive.
- Return signals and functions, never writable state. Changes go through the stores.
- Use `DestroyRef` for cleanup (intervals, subscriptions). It is tied to the calling component.
- Don't write one for a single pass-through. If a component only needs `postsStore.drafts()`, inject the store.
