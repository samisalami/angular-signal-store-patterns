import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Post } from '../../01-domain-functions/a-companion-object/post';
import { PostsStore } from '../../02-store-organisation/c-store-features/posts.store';
import { injectPostLike } from './inject-post-like';
import { injectPostPermissions } from './inject-post-permissions';

// Shows the post, a like button and an edit button -> takes both concerns.
// Reading the post itself is a plain store read, so it needs no inject function.
@Component({
  selector: 'app-post-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (post(); as post) {
      <article>
        <h2>{{ post.title }}</h2>
        <p>{{ post.body }}</p>

        <button type="button" [attr.aria-pressed]="like.isLiked()" (click)="like.toggleLike()">
          ♥ {{ like.likeCount() }}
        </button>

        @if (permissions.canEdit()) {
          <button type="button" (click)="permissions.edit()">Edit</button>
        }
      </article>
    }
  `,
})
export class PostCardComponent {
  readonly postId = input.required<string>();

  private readonly postsStore = inject(PostsStore);

  protected readonly post = computed<Post | undefined>(() => this.postsStore.entityMap()[this.postId()]);
  protected readonly like = injectPostLike(this.postId);
  protected readonly permissions = injectPostPermissions(this.postId);
}
