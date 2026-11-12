# Where does it go?

The three layers only help if everyone splits code the same way. "It felt like store logic" is not a rule. This page replaces taste with questions that have a yes/no answer, names that can be checked, and lint rules that fail the build.

## The four questions

Ask them in order. The first "yes" decides.

| # | Question | Yes -> | Example |
|---|---|---|---|
| 1 | Can it be written using **only its arguments**, importing nothing from Angular, NgRx or RxJS? | **Domain function** | `Post.isEditableBy(post, user)` |
| 2 | Does it **change state** or **talk to the server**? | **Store method** | `postsStore.toggleLike(postId, user)` |
| 3 | Is it derived from **one store's state alone**, with **no parameter**? | **Store computed** | `postsStore.drafts()` |
| 4 | Everything else: it needs a parameter (which post), a second store (who is signed in) or a service (router, dialog). | **View side** | `isLiked`, `canEdit`, `edit()` |

For question 4, count the views that need it:

- **one view** -> it stays in that component
- **two or more views** -> an inject function

Extract at the second use, not the first. Until a second view needs it, you don't know what the shared part is.

In an event-driven store ([chapter 2, option E](02-store-organisation/#option-e-events-when-methods-stop-being-enough)), the answer to question 2 is a reducer case plus an event handler instead of a method. The questions stay the same.

Most real features are split by these questions into several pieces. "Like a post" becomes:

| Piece | Question | Where |
|---|---|---|
| what a post looks like after a like | 1 | `Post.toggleLike(post, user)` |
| save it, tell the server, roll back on failure | 2 | `postsStore.toggleLike(postId, user)` |
| is it liked by whoever is signed in; send anonymous users to sign in | 4, used by two views | `injectPostLike(post)` |

## Who may call what

| | Domain queries | Domain updates | Store signals | Store methods | Router, dialogs, toasts |
|---|---|---|---|---|---|
| **Store / store feature** | yes | yes | its own | its own | **no** |
| **Inject function** | yes | **no** | yes | yes | yes |
| **Component** | yes, in a view-specific `computed` | **no** | yes | yes | yes |

A *query* answers a question (`Post.isDraft`). An *update* returns the changed object (`Post.toggleLike`). Only a store may call an update, because only a store can save the result. A component that calls one has either thrown the result away or is about to change state behind the store's back.

## Rules for signatures and names

These are checkable in review without knowing the feature.

**Store methods**

- Take the **actor as an argument**: `toggleLike(postId, user)`, not `toggleLike(postId)` that looks up the signed-in user itself. The store stays ignorant of sessions and is testable without one.
- Are named **verb + domain noun**: `loadAll`, `toggleLike`, `createPost`, `deletePost`, `publish`.
- Never contain a view word: `Viewer`, `Current`, `Selected`, `ForCard`, `Navigate`, `Open`, `Show`.

**Store computeds**

- Take no parameter. `drafts()` yes. `postById(id)` or `isLikedBy(postId)` no: the parameter means the view decides, so it's question 4.

**Store features**

- Are named `with` + entity + concern: `withPostLoading`, `withPostLikes`.
- A name with `And`, `Utils`, `Methods`, `Misc` or `Helpers` in it means the feature has no single concern.

**Inject functions**

- Are named `inject` + entity + concern: `injectPostLike`, `injectPostPermissions`.
- A name that contains a component or page name, or `ViewModel`, `Facade`, `State`, means it was split by view, not by concern.
- Take inputs as `Signal`s and return signals and functions. Never a writable signal.

**Domain functions**

- Take the object first: `Post.isLikedBy(post, user)`.
- Queries start with `is`, `has`, `can`, or name what they return. Updates are verbs and return the type they received.

## What is one concern?

Two tests, for store features and inject functions alike.

**The delete test.** "If the product dropped liking tomorrow, which lines would go?" If the answer is one file, that file is a concern. If the answer is "four lines here, a computed there, half of that method", the split is wrong.

**The usage test.** Look at the callers. If every caller uses nearly everything the function returns, it's one concern. If callers regularly take one member and ignore the rest, split it along the line they already draw.

`injectPostLike` passes both: removing liking removes exactly this file plus `withPostLikes`, and every view that calls it uses both `isLiked` and `toggleLike()`. A single `injectPost` returning likes *and* permissions fails the usage test: the feed row ignores the permissions, the moderation row ignores the likes.

**When not to split at all:**

- A store with one concern stays one `signalStore(...)` call. A feature for a two-line method is noise.
- A component that only reads `postsStore.drafts()` injects the store. An inject function that only passes things through is noise.

## Red flags in review

| You see | It should be |
|---|---|
| A domain file imports `@angular/*` or `@ngrx/*` | Split it: the pure part stays, the rest moves to a store or inject function |
| A file in `helpers/` or `utils/` mentions `Post` | A domain function next to `Post` |
| A store imports `Router`, opens a dialog or shows a toast | An inject function |
| A store method reads `SessionStore` to find out who is acting | Pass the actor in as an argument |
| A store method or computed named `...ForViewer`, `...ForCard`, `selected...` | View side (question 4) |
| A component calls `patchState`, an API service, or a domain update | A store method |
| The same `computed` in two components | An inject function if it needs context, a store computed if it doesn't |
| Two components inject the same two stores and combine them the same way | An inject function |
| An inject function named after a component, or one that every view only uses part of | Split by concern |
| An inject function returns a writable signal or calls `patchState` | A store method |
| A component receives an id and every child looks the entity up again | Look it up once at the page, pass the entity down |

## Enforced by lint

The import rules above don't need a reviewer. [`eslint.config.js`](eslint.config.js) recognises each layer by its file name and fails on a wrong import:

| Files | Must not import | Why |
|---|---|---|
| domain (`post.ts`, `user.ts`) | `@angular/*`, `@ngrx/*`, `rxjs` | question 1 |
| `*.store.ts`, `with-*.ts` | `@angular/router`, components, inject functions | stores don't know the view |
| `*.component.ts`, `inject-*.ts` | `patchState`, `*-api` services | only stores change state and talk to the server |

```bash
npm run lint
```

One folder is exempt on purpose: [`03-component-access/b-store-view-methods`](03-component-access/b-store-view-methods/) puts view logic into the store, so its store imports `Router`. That is exactly what the rule exists to stop.

What lint can't see (a component calling a domain update, a store method that is really view logic, a badly cut concern) is what the names, the tests and the red flag table are for.
