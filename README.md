# Angular Signal Store Patterns

Where does the functional code around an NgRx Signal Store go, if not into the store itself and not into a `helpers/` folder?

Vue has composables, React has hooks. Angular with NgRx Signal Store splits the same idea into three layers. Which layer a piece of code belongs in depends on what it needs:

| The code needs… | Pattern | Vue / React analogue |
|---|---|---|
| nothing but your data | [Domain functions](01-domain-functions/) | a plain TS module |
| store state, methods or lifecycle | [Store features](02-store-organisation/) (`withX()`) | a composable used inside a store |
| DI, used by components | [Inject functions](03-component-access/) (`injectX()`) | a composable / hook |

"Helpers" stays reserved for code that knows nothing about your domain: strings, arrays, dates.

## Options, side by side

Each chapter shows every option as real code in its own folder, all solving the same problem, so you can compare them directly. The chapter README explains the trade-offs.

| Chapter | Options | Recommended |
|---|---|---|
| [1. Domain functions](01-domain-functions/) | A companion object · B module namespace | A or B |
| [2. Store organisation](02-store-organisation/) | A inline · B method factories · C store features · D features with callbacks | C, plus D for generic features |
| [3. Component access](03-component-access/) | A logic in component · B view methods on store · C component service · D inject function | D |

Later chapters build on the recommended option of earlier ones: chapter 2 uses the `Post` from `01-domain-functions/a-companion-object`, and chapter 3 uses the store from `02-store-organisation/c-store-features`.

## The example

A small blog: **posts** that signed-in **users** can like, and that their authors (or admins) can edit.

```
01-domain-functions/
  a-companion-object/        post.ts, post.spec.ts
  b-module-namespace/        post.ts, post.spec.ts
02-store-organisation/
  a-inline-store/            posts.store.ts
  b-method-factories/        posts.store.ts, create-load-all.ts, create-toggle-like.ts, posts-store-internals.ts
  c-store-features/          posts.store.ts, with-post-loading.ts, with-post-likes.ts
  d-feature-callbacks/       posts.store.ts, with-auto-refresh.ts
03-component-access/
  a-logic-in-component/      post-card.component.ts
  b-store-view-methods/      posts.store.ts, post-card.component.ts
  c-component-service/       post-view.service.ts, post-card.component.ts
  d-inject-function/         inject-post.ts, post-card.component.ts
shared/                      user.ts, session.store.ts, posts-api.ts, with-request-status.ts
```

## Why is there a package.json?

You don't need Node to read this repo. The code isn't an app to run, it's example code. The package only exists to keep the examples honest:

- `npm run typecheck` compiles every option, including the discouraged ones, against the real Angular and NgRx APIs. A snippet that no longer matches the library fails here instead of misleading readers.
- `npm test` runs the domain function specs.

```bash
npm install
npm run typecheck
npm test
```

Needs npm 11 or newer: npm 10.9 crashes on `npm install` here with `Cannot read properties of null (reading 'edgesOut')`. On an older npm, run `npx npm@11 install` instead.

Targets Angular 21 and `@ngrx/signals` 21. `withFeature` (chapter 2, option D) needs `@ngrx/signals` 20 or newer.
