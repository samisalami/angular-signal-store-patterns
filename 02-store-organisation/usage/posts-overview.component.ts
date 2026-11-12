import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PostsStore } from '../c-store-features/posts.store';

// The simplest consumer of a store: inject it, read its signals, call its methods.
// Everything this view needs is already a parameterless signal or method on the store,
// so there is nothing to put between the store and the template.
//
// The import above could point at any of the four options: they expose the same API.
@Component({
  selector: 'app-posts-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <h2>Posts</h2>

      @if (postsStore.isPending()) {
        <p>Loading posts…</p>
      }

      @if (postsStore.error(); as error) {
        <p role="alert">Could not load posts: {{ error }}</p>
        <button type="button" (click)="postsStore.loadAll()">Retry</button>
      }

      @if (postsStore.isFulfilled()) {
        <p>{{ postsStore.publishedPosts().length }} published, {{ postsStore.drafts().length }} drafts</p>

        <ul>
          @for (post of postsStore.publishedPosts(); track post.id) {
            <li>{{ post.title }}</li>
          }
        </ul>
      }
    </section>
  `,
})
export class PostsOverviewComponent {
  protected readonly postsStore = inject(PostsStore);
}
