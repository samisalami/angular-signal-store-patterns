# 1. Domain functions

Functions that describe what a data type *is* and what can happen to it: "is this post a draft?", "may this user edit it?", "what does the post look like after this user likes it?".

They are not helpers. A helper knows nothing about your domain (`chunk(array, size)`, `capitalize(text)`). These functions are the behaviour of your types, so they live next to the type.

Rules for both options:

- No Angular, no NgRx, no DI. Data in, data out.
- Never mutate. Return a new object.
- Everything else calls them: stores, store features, inject functions, components, tests.

| Option | Folder | Verdict |
|---|---|---|
| A: companion object | [`a-companion-object/`](a-companion-object/) | **used by the rest of this repo** |
| B: module namespace | [`b-module-namespace/`](b-module-namespace/) | equally fine |

## Option A: companion object

TypeScript lets a type and a value share one name. The value holds the functions. See [`a-companion-object/post.ts`](a-companion-object/post.ts):

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

  // isLikedBy, toggleLike…
};
```

```ts
import { Post } from './post';

const draft: Post = { /* … */ };
Post.isEditableBy(draft, viewer);
```

## Option B: module namespace

Plain exported functions, imported as a namespace. See [`b-module-namespace/post.ts`](b-module-namespace/post.ts):

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

## Comparison

The two specs, [`a-companion-object/post.spec.ts`](a-companion-object/post.spec.ts) and [`b-module-namespace/post.spec.ts`](b-module-namespace/post.spec.ts), are identical except for the import and the type name. That is the whole difference.

| | A: companion object | B: module namespace |
|---|---|---|
| Call site | `Post.isDraft(post)` | `Post.isDraft(post)` |
| Type name | `Post` | `Post.Post`, or a second `import type { Post }` |
| Tree shaking of unused functions | no, the object is kept whole | yes |
| One function calling another | `Post.isLikedBy(…)` | `isLikedBy(…)` |

Pick one per codebase. Tree shaking only matters once a type has many functions and only some are used per bundle.

## Why not put these in the store?

`Post.isEditableBy` is needed by the store (to filter), by the component layer (to show the Edit button) and maybe by a route guard. Inside the store, it can only be reached through the store. Outside, everyone can use it, and its test needs no `TestBed`, no providers and no mocks.
