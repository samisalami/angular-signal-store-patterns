import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Post } from '../../01-domain-functions/a-companion-object/post';
import { PostsStore } from '../../02-store-organisation/c-store-features/posts.store';
import { PostCardComponent } from './post-card.component';

// A second page that shows a post: route /posts/:postId, with the router binding
// the parameter to the input (withComponentInputBinding).
// The id -> post lookup happens once, here at the page. Below the page, everything
// works with the post itself, so the card is reused unchanged.
@Component({
  selector: 'app-post-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PostCardComponent],
  template: `
    @if (post(); as post) {
      <app-post-card [post]="post" />
    } @else if (postsStore.isPending()) {
      <p>Loading post…</p>
    } @else {
      <p>This post does not exist.</p>
    }
  `,
})
export class PostDetailPageComponent {
  readonly postId = input.required<string>();

  protected readonly postsStore = inject(PostsStore);

  protected readonly post = computed<Post | undefined>(() => this.postsStore.entityMap()[this.postId()]);
}
