import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Post } from '../../01-domain-functions/a-companion-object/post';
import { PostViewService } from './post-view.service';

@Component({
  selector: 'app-post-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // one service instance per card, destroyed with it
  providers: [PostViewService],
  template: `
    <article>
      <h2>{{ post().title }}</h2>
      <p>{{ post().body }}</p>

      <button type="button" [attr.aria-pressed]="postView.isLiked()" (click)="postView.toggleLike()">
        ♥ {{ post().likedBy.length }}
      </button>

      @if (postView.canEdit()) {
        <button type="button" (click)="postView.edit()">Edit</button>
      }
    </article>
  `,
})
export class PostCardComponent {
  readonly post = input.required<Post>();

  protected readonly postView = inject(PostViewService).connect(this.post);
}
