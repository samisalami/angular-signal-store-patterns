import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PostsStore } from '../../02-store-organisation/c-store-features/posts.store';
import { PostCardComponent } from './post-card.component';

// The page is where state enters the view. It reads the store directly:
// everything it needs is a parameterless signal or method, so an inject function
// in between would only pass things through.
// Each post is handed down as an input. What a card does with it is the card's business.
@Component({
  selector: 'app-feed-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PostCardComponent],
  template: `
    <h1>Feed</h1>

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
