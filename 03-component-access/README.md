# 3. From store to view

Chapter 2 ended with the simple case: a component injects a store, reads its signals and calls its methods. That covers every view that needs only what the store already offers.

This chapter is about the views that need more. A post card has to:

- show whether the **signed-in user** liked the post, and toggle the like (anonymous users are sent to sign in)
- show an Edit button only if the signed-in user **may edit** the post, and navigate to the editor

`PostsStore` can't answer any of that alone. It takes `PostsStore`, `SessionStore`, `Router` and the `Post` domain rules together. The question is where that combination lives.

| Option | Folder | Verdict |
|---|---|---|
| A: logic in the component | [`a-logic-in-component/`](a-logic-in-component/) | right as long as only one view needs it |
| B: view methods on the store | [`b-store-view-methods/`](b-store-view-methods/) | avoid |
| C: component-provided service | [`c-component-service/`](c-component-service/) | works, more ceremony |
| D: inject functions | [`d-inject-function/`](d-inject-function/) | **recommended** once two views share logic |
| E: presentational component | [`e-presentational-component/`](e-presentational-component/) | right for UI pieces without domain knowledge |

All options build the same post card. Option D goes further and shows the whole path with two pages and three components.

## Option A: logic in the component

[`a-logic-in-component/post-card.component.ts`](a-logic-in-component/post-card.component.ts) injects both stores and the router and builds `isLiked`, `canEdit`, `toggleLike()` and `edit()` itself.

This is the correct starting point, not a mistake. While the card is the only view with a like button, the logic has one home and nothing to share. The problem starts with the second view: the feed row needs `isLiked` and `toggleLike()` too, and the choices are copy and paste or a base class.

## Option B: view methods on the store

[`b-store-view-methods/posts.store.ts`](b-store-view-methods/posts.store.ts) answers the view's questions itself: `isLikedByViewer(post)`, `canViewerEdit(post)`, `toggleLikeAsViewer(post)`, `editPost(post)`.

The component becomes thin, but:

- `PostsStore` now depends on `SessionStore` and `Router`. A state container knows about navigation.
- Every screen adds its own "from the viewer's point of view" methods, and the store grows view logic for all of them.
- The method names give it away: `Viewer` is a view word (see the [naming rules](../WHERE-DOES-IT-GO.md#rules-for-signatures-and-names)).

This folder is the one place exempt from the repo's lint rules, because its store imports `Router`.

## Option C: component-provided service

[`c-component-service/post-view.service.ts`](c-component-service/post-view.service.ts) holds the same logic as option D's two inject functions, combined in one `@Injectable()` class. The component provides it (`providers: [PostViewService]`), so each card gets its own instance.

It works, but a class needs ceremony that a function doesn't:

- a `providers` entry on every component that uses it
- the service can't see the component's `input()`, so it needs a `connect(post)` bridge and an internal "signal of a signal"
- every member has to handle "not connected yet"
- one service per component tends to become one service per view, which is the split by view that option D avoids

## Option D: inject functions (recommended)

An inject function is a plain function that calls `inject()`, builds `computed`s and returns signals plus actions. It is the closest Angular has to a Vue composable or a React hook. By convention its name starts with `inject`, like `injectQueryParams` in ngxtension.

### The whole path

[`d-inject-function/`](d-inject-function/) shows every step from store to template:

| File | Role | Gets its data from |
|---|---|---|
| [`feed-page.component.ts`](d-inject-function/feed-page.component.ts) | page | `PostsStore` directly: `publishedPosts()`, `isPending()`, `error()`, `loadAll()` |
| [`post-detail-page.component.ts`](d-inject-function/post-detail-page.component.ts) | page | `PostsStore` directly: looks the post up by route id |
| [`post-card.component.ts`](d-inject-function/post-card.component.ts) | component | `post` input + `injectPostLike` + `injectPostPermissions` |
| [`post-list-row.component.ts`](d-inject-function/post-list-row.component.ts) | component | `post` input + `injectPostLike` |
| [`moderation-row.component.ts`](d-inject-function/moderation-row.component.ts) | component | `post` input + `injectPostPermissions` + its own `statusLabel` |

Three rules produce this shape:

**1. Pages read the store directly.** Everything the feed needs is a parameterless signal or method on the store, so nothing goes in between:

```ts
@Component({
  selector: 'app-feed-page',
  imports: [PostCardComponent],
  template: `
    @if (postsStore.isPending()) {
      <p>Loading posts…</p>
    }

    @if (postsStore.error(); as error) {
      <p role="alert">Could not load posts: {{ error }}</p>
      <button type="button" (click)="postsStore.loadAll()">Retry</button>
    }

    @for (post of postsStore.publishedPosts(); track post.id) {
      <app-post-card [post]="post" />
    }
  `,
})
export class FeedPageComponent {
  protected readonly postsStore = inject(PostsStore);
}
```

**2. Pass the post, not its id.** The page already has the post. Handing down `post.id` would make every child look it up again and handle "not found". The detail page, which starts from a route id, does that lookup once and then passes the post on like the feed does. Below the pages, nothing knows where a post came from.

**3. Components take their concerns from inject functions.** The card receives a post and adds what it needs:

```ts
export class PostCardComponent {
  readonly post = input.required<Post>();

  protected readonly like = injectPostLike(this.post);
  protected readonly permissions = injectPostPermissions(this.post);
}
```

It injects no store and no router. The same two lines work in any component that has a post.

### One inject function per concern, not per view

The tempting version is one big `injectPost()` that returns everything any post view might need. That only moves the problem: the store stays small, but `injectPost` now grows with every new view. The only gain would be that the growth sits in a different file.

So split by **concern**. A concern is something several views need: liking a post, what the user may do with a post. Each view takes the concerns it shows:

| View | Shows | Uses |
|---|---|---|
| post card | post, like button, edit button | `injectPostLike` + `injectPostPermissions` |
| feed row | title, like button | `injectPostLike` |
| moderation row | title, status, edit button | `injectPostPermissions` |

Three views, two inject functions. The number of inject functions grows with the concerns in your domain, not with your screens:

- a new **view** -> combine existing inject functions
- a new **permission** (delete, publish) -> extend `injectPostPermissions`
- a new **concern** that several views share (bookmarking, say) -> a new `injectPostBookmark`

How to tell a concern from a view model, and when to split one, is in [Where does it go?](../WHERE-DOES-IT-GO.md#what-is-one-concern)

### What an inject function adds

[`d-inject-function/inject-post-like.ts`](d-inject-function/inject-post-like.ts):

```ts
export function injectPostLike(post: Signal<Post>) {
  const postsStore = inject(PostsStore);
  const sessionStore = inject(SessionStore);
  const router = inject(Router);

  const isLiked = computed(() => {
    const viewer = sessionStore.currentUser();
    return viewer !== null && Post.isLikedBy(post(), viewer);
  });

  return {
    isLiked,

    toggleLike(): void {
      const viewer = sessionStore.currentUser();
      if (viewer === null) {
        void router.navigate(['/sign-in']);
        return;
      }
      void postsStore.toggleLike(post().id, viewer);
    },
  };
}
```

It contains no rule and no state. Both already exist:

| Already exists | The inject function adds | Result |
|---|---|---|
| `Post.isLikedBy(post, user)` (domain) | "the user is whoever is signed in" | `isLiked` |
| `postsStore.toggleLike(postId, user)` (store) | the same, plus "or go and sign in" | `toggleLike()` |

That is the test for whether logic belongs here: an inject function supplies **context** (who is looking, where to navigate) to rules and state that live elsewhere. If you find yourself writing a rule in one (`post().authorId === viewer.id`), it belongs in a domain function. If you find yourself changing state, it belongs in a store method.

[`d-inject-function/inject-post-permissions.ts`](d-inject-function/inject-post-permissions.ts) is the same shape for `canEdit` and `edit()`. It doesn't even need `PostsStore`.

### What stays in the component

The moderation row shows a status label that no other view has:

```ts
protected readonly statusLabel = computed(() => (Post.isDraft(this.post()) ? 'Draft' : 'Published'));
```

One view needs it, so it stays in that view. It moves to an inject function when a second view needs it, not before.

### One click, traced

What happens when a signed-in user clicks ♥ on a card in the feed:

1. **Template** -> `like.toggleLike()` on the card.
2. **Inject function** reads `sessionStore.currentUser()` and calls `postsStore.toggleLike(post().id, viewer)`.
3. **Store method** (`withPostLikes`) asks the **domain function** `Post.toggleLike(post, viewer)` for the new post, saves it with `setEntity`, then tells the server. If the server rejects it, the old post is put back.
4. **Signals** do the way back. `entityMap` changed -> `publishedPosts` recomputes -> the feed page hands the card a new `post` -> `like.isLiked` recomputes through `Post.isLikedBy` -> the button re-renders.

Nothing in steps 1 and 2 changed state, and nothing in step 3 knows a button exists.

### Testing

An inject function is tested the way it is used: called in an injection context, with no component and no template. [`d-inject-function/inject-post-like.spec.ts`](d-inject-function/inject-post-like.spec.ts):

```ts
it('should send an anonymous user to sign in instead of liking', () => {
  const like = TestBed.runInInjectionContext(() => injectPostLike(post));

  like.toggleLike();

  expect(router.navigate).toHaveBeenCalledWith(['/sign-in']);
  expect(postsStore.entityMap()[POST_ID].likedBy).toEqual([]);
});
```

### Rules

- Call it only in an injection context: a field initializer or the constructor. Not in `ngOnInit`, not in event handlers.
- Take inputs as `Signal`s, not plain values, so the result stays reactive.
- Return signals and functions, never writable state. Changes go through the stores.
- Inject functions don't call each other's results. Each derives what it needs from stores and domain functions, so a view can take any combination.
- Use `DestroyRef` for cleanup (intervals, subscriptions). It is tied to the calling component.

## Option E: presentational component

The classic container/presentational split. [`e-presentational-component/post-card.component.ts`](e-presentational-component/post-card.component.ts) has no `inject()` at all: `post`, `isLiked` and `canEdit` come in as inputs, `likeToggled` and `editRequested` go out as outputs.

The card is trivially reusable and testable. The price is paid by the parent. [`e-presentational-component/feed-page.component.ts`](e-presentational-component/feed-page.component.ts) now has to know who is signed in, both rules and both actions, and so does every other page that shows a card. It is option A's duplication, moved one level up, plus an input and an output for every fact and every action.

Where it is the right choice: components with **no domain knowledge**. A button, an avatar, a dialog shell, a generic card layout. They should not know what a post is, let alone inject a store.

Where it isn't: components that are *about* a domain object. A post card that can't like a post without its parent's help makes every parent repeat the wiring.

So D and E combine instead of competing:

| Component | Knows the domain? | Gets its data via |
|---|---|---|
| UI piece (button, avatar, layout) | no | inputs and outputs only |
| domain component (post card, feed row) | yes | the entity as input + inject functions |
| page | yes | the store directly |

## Compared

| | A: in component | B: on the store | C: service | D: inject functions | E: presentational |
|---|---|---|---|---|---|
| Logic shared between views | no | yes | yes | yes | no, repeated per parent |
| Store stays free of view logic | yes | **no** | yes | yes | yes |
| Split by concern, combinable | no | no | hard, services nest | yes | no |
| Ceremony per use | none | none | `providers` + `connect()` | one line | inputs + outputs per member |
| Testable without a component | no | yes | yes | yes | n/a |
