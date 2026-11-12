import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { PostViewService } from './post-view.service';

@Component({
  selector: 'app-post-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // one service instance per card, destroyed with it
  providers: [PostViewService],
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

  protected readonly postView = inject(PostViewService).connect(this.postId);
}
