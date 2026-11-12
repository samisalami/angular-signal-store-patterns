# 3. Inject functions

An inject function is a plain function that calls `inject()`, builds `computed`s and returns signals plus actions. It is the closest Angular has to a Vue composable or a React hook. By convention its name starts with `inject`, like `injectQueryParams` in ngxtension.

It is the layer *between* stores and components: it takes several stores and services and turns them into exactly what one kind of component needs.

## The problem

A post card has to show a post, show whether the signed-in user liked it, show an Edit button only if they may edit it, toggle the like (or send anonymous users to sign in), and navigate to the editor.

That needs `PostsStore`, `SessionStore`, `Router` and the `Post` domain rules. Without an inject function, all of it lands in the component:

```ts
@Component({ /* … */ })
export class PostCardComponent {
  readonly postId = input.required<string>();

  private readonly postsStore = inject(PostsStore);
  private readonly sessionStore = inject(SessionStore);
  private readonly router = inject(Router);

  protected readonly post = computed(() => this.postsStore.entityMap()[this.postId()]);
  protected readonly isLiked = computed(() => {
    const currentPost = this.post();
    const viewer = this.sessionStore.currentUser();
    return currentPost !== undefined && viewer !== null && Post.isLikedBy(currentPost, viewer);
  });
  protected readonly canEdit = computed(() => { /* same dance with isEditableBy */ });

  protected toggleLike(): void { /* sign-in redirect + store call */ }
  protected edit(): void { /* router call */ }
}
```

Now the post detail page needs the same thing, and the post list row too. Copy and paste, or a base class, or…

## The inject function

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

  const canEdit = computed(() => {
    const currentPost = post();
    const viewer = sessionStore.currentUser();
    return currentPost !== undefined && viewer !== null && Post.isEditableBy(currentPost, viewer);
  });

  const likeCount = computed(() => post()?.likedBy.length ?? 0);

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

## The component

```ts
@Component({
  selector: 'app-post-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (postView.post(); as post) {
      <article>
        <h2>{{ post.title }}</h2>
        <p>{{ post.body }}</p>

        <button type="button" [attr.aria-pressed]="postView.isLiked()" (click)="postView.toggleLike()">
          ♥ {{ postView.likeCount() }}
        </button>

        @if (postView.canEdit()) {
          <button type="button" (click)="postView.edit()">Edit</button>
        }
      </article>
    }
  `,
})
export class PostCardComponent {
  readonly postId = input.required<string>();

  protected readonly postView = injectPost(this.postId);
}
```

The component doesn't know that two stores exist, that liking is optimistic, or who may edit a post. A `PostDetailPage` gets the same behaviour with the same one line. The input is a `Signal`, so `postView` follows a changing `postId` automatically.

## Why not a store?

Couldn't `PostsStore` expose `isLikedByViewer(postId)`? It could, but then `PostsStore` has to depend on `SessionStore` and `Router`, and every store slowly grows view logic for every screen. Stores own **state**. Inject functions own **one view's perspective on that state**, and they are created per component instance and destroyed with it.

## Why not a service?

A component-provided service (`providers: [PostViewService]`) works too. It costs a class, a `providers` entry, and an input bridge (the service can't read the component's `input()` directly). An inject function receives the signal as an argument and needs none of that.

## Rules

- Call it only in an injection context: a field initializer or the constructor. Not in `ngOnInit`, not in event handlers.
- Take inputs as `Signal`s, not plain values, so the result stays reactive.
- Return signals and functions, never writable state. Changes go through the stores.
- Use `DestroyRef` for cleanup (intervals, subscriptions). It is tied to the calling component.
- Don't write one for a single pass-through. If a component only needs `postsStore.drafts()`, inject the store.
