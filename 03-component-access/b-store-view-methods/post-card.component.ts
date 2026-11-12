import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Post } from '../../01-domain-functions/a-companion-object/post';
import { PostsStore } from './posts.store';

// The component is thin, but it passes postId() into every store call,
// and the store has grown methods that only this kind of view needs.
@Component({
  selector: 'app-post-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (post(); as post) {
      <article>
        <h2>{{ post.title }}</h2>
        <p>{{ post.body }}</p>

        <button
          type="button"
          [attr.aria-pressed]="postsStore.isLikedByViewer(postId())"
          (click)="postsStore.toggleLikeAsViewer(postId())"
        >
          ♥ {{ post.likedBy.length }}
        </button>

        @if (postsStore.canViewerEdit(postId())) {
          <button type="button" (click)="postsStore.editPost(postId())">Edit</button>
        }
      </article>
    }
  `,
})
export class PostCardComponent {
  readonly postId = input.required<string>();

  protected readonly postsStore = inject(PostsStore);

  protected readonly post = computed<Post | undefined>(() => this.postsStore.entityMap()[this.postId()]);
}
