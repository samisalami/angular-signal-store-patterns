# 1. Domain functions

Functions that describe what a data type *is* and what can happen to it: "is this post a draft?", "may this user edit it?", "what does the post look like after this user likes it?".

They are not helpers. A helper knows nothing about your domain (`chunk(array, size)`, `capitalize(text)`). These functions are the behaviour of your types, so they live next to the type.

Rules for all options:

- No Angular, no NgRx, no DI. Data in, data out.
- Never mutate. Return a new object.
- There are two kinds:
  - **Queries** answer a question: `isDraft`, `isEditableBy`, `isLikedBy`.
  - **Transitions** return the object after something happened to it: `toggleLike`.

Each option folder has the type with its functions (`post.ts`), a spec (`post.spec.ts`) and a minimal store that uses them (`posts.store.ts`).

| Option | Folder | Verdict |
|---|---|---|
| A: companion object | [`a-companion-object/`](a-companion-object/) | **recommended**, used by the rest of this repo |
| B: module namespace | [`b-module-namespace/`](b-module-namespace/) | equally fine |
| C: class | [`c-class/`](c-class/) | avoid |

## Option A: companion object

TypeScript lets a type and a value share one name. The value holds the functions. [`a-companion-object/post.ts`](a-companion-object/post.ts):

```ts
export type Post = {
  id: string;
  authorId: string;
  title: string;
  body: string;
  publishedAt: string | null;
  likedBy: string[];
};

export const Post = {
  isDraft(post: Post): boolean {
    return post.publishedAt === null;
  },

  isEditableBy(post: Post, user: User): boolean {
    return post.authorId === user.id || User.isAdmin(user);
  },

  isLikedBy(post: Post, user: User): boolean {
    return post.likedBy.includes(user.id);
  },

  toggleLike(post: Post, user: User): Post {
    const likedBy = Post.isLikedBy(post, user)
      ? post.likedBy.filter((likerId) => likerId !== user.id)
      : [...post.likedBy, user.id];
    return { ...post, likedBy };
  },
};
```

One import gives you both the type and the functions:

```ts
import { Post } from './post';

const draft: Post = { /* … */ };
Post.isEditableBy(draft, viewer);
```

## Option B: module namespace

Plain exported functions, imported as a namespace. [`b-module-namespace/post.ts`](b-module-namespace/post.ts):

```ts
export type Post = { /* same as above */ };

export function isDraft(post: Post): boolean {
  return post.publishedAt === null;
}

export function isEditableBy(post: Post, user: User): boolean {
  return post.authorId === user.id || User.isAdmin(user);
}
```

```ts
import * as Post from './post';

const draft: Post.Post = { /* … */ };
Post.isEditableBy(draft, viewer);
```

The specs and stores of A and B are identical except for the import and the type name (`Post` vs. `Post.Post`). That is the whole difference.

| | A: companion object | B: module namespace |
|---|---|---|
| Call site | `Post.isDraft(post)` | `Post.isDraft(post)` |
| Type name | `Post` | `Post.Post`, or a second `import type { Post }` |
| Tree shaking of unused functions | no, the object is kept whole | yes |
| One function calling another | `Post.isLikedBy(…)` | `isLikedBy(…)` |

Pick one per codebase. Tree shaking only matters once a type has many functions and only some are used per bundle.

## Option C: class

The classic OOP model: data and behaviour in one class, called as `post.isDraft()`. [`c-class/post.ts`](c-class/post.ts).

It reads well, but the methods live on the prototype, and state management constantly makes copies that drop the prototype. [`c-class/post.spec.ts`](c-class/post.spec.ts) has a test for each way this goes wrong:

- `{ ...post }` (how every immutable update is written) returns a plain object without methods.
- A JSON round trip (HTTP, `localStorage`, state transfer, DevTools) returns a plain object without methods.
- Server data is never an instance, so everything entering the app must go through `Post.fromJson`. [`c-class/posts.store.ts`](c-class/posts.store.ts) shows that extra step. Miss it once and `post.isDraft()` throws at runtime while TypeScript stays silent.

Options A and B have none of these problems, because the data is plain and the functions don't travel with it.

## How domain functions are used

### In a store

A store uses **queries inside computeds** and **transitions inside methods**. From [`a-companion-object/posts.store.ts`](a-companion-object/posts.store.ts):

```ts
export const PostsStore = signalStore(
  withEntities<Post>(),
  withComputed(({ entities }) => ({
    // a query inside a computed -> the store offers ready-made, parameterless views of its state
    drafts: computed(() => entities().filter((post) => Post.isDraft(post))),
  })),
  withMethods((store) => ({
    setAll(posts: Post[]): void {
      patchState(store, setAllEntities(posts));
    },

    // a transition inside a method -> the domain function decides WHAT the new post is,
    // the store decides THAT it is saved
    toggleLike(postId: string, user: User): void {
      const post = store.entityMap()[postId];
      if (post) {
        patchState(store, setEntity(Post.toggleLike(post, user)));
      }
    },
  })),
);
```

The division of labour: the domain function knows the rule, the store knows where the state lives. The store method stays short, and the rule is testable without a store. Chapter 2 builds the full store (server calls, optimistic update, rollback) on the same two calls.

### In an inject function

Inject functions use **queries**, and add the context a query can't know. `Post.isLikedBy(post, user)` needs a user. "The user is whoever is signed in" is not a fact about posts, so it lives in [`injectPostLike`](../03-component-access/d-inject-function/inject-post-like.ts):

```ts
const isLiked = computed(() => {
  const viewer = sessionStore.currentUser();
  return viewer !== null && Post.isLikedBy(post(), viewer);
});
```

### In a component

Rarely, and only queries. The component is the view layer, so it decides how things *look*, not what they *mean*. A query is allowed when it feeds a `computed` that only this one view needs. From the [moderation row](../03-component-access/d-inject-function/moderation-row.component.ts):

```ts
protected readonly statusLabel = computed(() => (Post.isDraft(this.post()) ? 'Draft' : 'Published'));
```

The label text is presentation and belongs to the component. What makes a post a draft is a rule and stays in `Post.isDraft`. The component must not write `this.post().publishedAt === null` itself: the day drafts get a second condition, that copy is wrong.

Two things a component never does:

- **Call a transition.** `Post.toggleLike(post, user)` returns a new post, and a component has nowhere to put it. Changes go through a store method.
- **Combine a query with another store.** As soon as a component injects `SessionStore` to feed a query, that is view context several views will need -> an inject function.

### Summary

| Caller | Queries | Transitions | Typical use |
|---|---|---|---|
| Store computed | yes | no | `drafts`, `publishedPosts` |
| Store method | yes | **yes** | `toggleLike` saves `Post.toggleLike(…)` |
| Inject function | yes | no | `isLiked`, `canEdit` for the signed-in user |
| Component | in a view-specific `computed` | no | `statusLabel` |
| Test | yes | yes | no `TestBed`, no mocks |

## Why not put these in the store?

`Post.isEditableBy` is needed by the permissions inject function, could be needed by a route guard, and by a store that filters "posts I can edit". Inside one store, it can only be reached through that store. As a domain function, every layer uses the same rule, and its test needs no `TestBed`, no providers and no mocks.
