import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Post } from '../../01-domain-functions/a-companion-object/post';
import { injectPostLike } from './inject-post-like';

// A compact row: title and like button, no editing -> only the like concern.
// A new view, but no new inject function.
@Component({
  selector: 'app-post-list-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <li>
      <span>{{ post().title }}</span>
      <button type="button" [attr.aria-pressed]="like.isLiked()" (click)="like.toggleLike()">
        ♥ {{ post().likedBy.length }}
      </button>
    </li>
  `,
})
export class PostListRowComponent {
  readonly post = input.required<Post>();

  protected readonly like = injectPostLike(this.post);
}
