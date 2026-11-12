import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { injectPost } from './inject-post';

// The component knows neither PostsStore, SessionStore nor Router.
// It renders what injectPost() hands it and forwards clicks.
@Component({
  selector: 'app-post-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (postView.post(); as post) {
      <article>
        <h2>{{ post.title }}</h2>
        <p>{{ post.body }}</p>

        <button type="button" [attr.aria-pressed]="postView.isLiked()" (click)="postView.toggleLike()">
          ♥ {{ postView.likeCount() }}
        </button>

        @if (postView.canEdit()) {
          <button type="button" (click)="postView.edit()">Edit</button>
        }
      </article>
    }
  `,
})
export class PostCardComponent {
  readonly postId = input.required<string>();

  protected readonly postView = injectPost(this.postId);
}
