# 1. Domain functions

Functions that describe what a data type *is* and what can happen to it: "is this post a draft?", "may this user edit it?", "what does the post look like after this user likes it?".

They are not helpers. A helper knows nothing about your domain (`chunk(array, size)`, `capitalize(text)`). These functions are the behaviour of your types, so they live next to the type.

## Rules

- No Angular, no NgRx, no DI. Data in, data out.
- Never mutate. Return a new object.
- Everything else calls them: stores, store features, inject functions, components, tests.

## Option A: companion object (used in this repo)

TypeScript lets a type and a value share one name. The value holds the functions:

```ts
import { User } from '../users/user';

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

Call sites read like methods on the type, but the data stays a plain object (serialisable, works in signals, no classes):

```ts
Post.isEditableBy(post, viewer);
```

## Option B: module namespace

Plain exported functions, imported as a namespace:

```ts
// post.ts
export type Post = { /* … */ };

export function isDraft(post: Post): boolean {
  return post.publishedAt === null;
}

export function isEditableBy(post: Post, user: User): boolean {
  return post.authorId === user.id || user.role === 'admin';
}
```

```ts
import * as Post from './post';

Post.isDraft(post);
```

| | Companion object | Module namespace |
|---|---|---|
| Call site | `Post.isDraft(post)` | `Post.isDraft(post)` |
| Type and functions in one import | yes | needs `Post.Post` for the type, or a second import |
| Tree shaking of unused functions | no, the object is kept whole | yes |
| Autocomplete after `Post.` | yes | yes |

Both are fine. Pick one per codebase. Tree shaking only matters when a type grows dozens of functions.

## Why not put these in the store?

`Post.isEditableBy` is needed by the store (to filter), by `injectPost` (to show the Edit button) and maybe by a route guard. Inside the store it can only be reached through the store. Outside the store, everyone can use it, and the test is just:

```ts
it('should let an admin edit a post they did not write', () => {
  expect(Post.isEditableBy(publishedPost, admin)).toBe(true);
});
```

No `TestBed`, no providers, no mocks. See [`src/posts/post.spec.ts`](../src/posts/post.spec.ts).
