import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Post } from '../../01-domain-functions/a-companion-object/post';
import { PostsStore } from '../../02-store-organisation/c-store-features/posts.store';
import { injectPostLike } from './inject-post-like';

// A compact row in the feed: title and like button, no editing -> only the like concern.
// A new view, but no new inject function.
@Component({
  selector: 'app-post-list-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (post(); as post) {
      <li>
        <span>{{ post.title }}</span>
        <button type="button" [attr.aria-pressed]="like.isLiked()" (click)="like.toggleLike()">
          ♥ {{ like.likeCount() }}
        </button>
      </li>
    }
  `,
})
export class PostListRowComponent {
  readonly postId = input.required<string>();

  private readonly postsStore = inject(PostsStore);

  protected readonly post = computed<Post | undefined>(() => this.postsStore.entityMap()[this.postId()]);
  protected readonly like = injectPostLike(this.postId);
}
