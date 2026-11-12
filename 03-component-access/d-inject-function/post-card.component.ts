import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Post } from '../../01-domain-functions/a-companion-object/post';
import { injectPostLike } from './inject-post-like';
import { injectPostPermissions } from './inject-post-permissions';

// Shows the post, a like button and an edit button -> takes both concerns.
// It knows no store and no router: the post comes in as an input,
// everything else comes from the two inject functions.
@Component({
  selector: 'app-post-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article>
      <h2>{{ post().title }}</h2>
      <p>{{ post().body }}</p>

      <button type="button" [attr.aria-pressed]="like.isLiked()" (click)="like.toggleLike()">
        ♥ {{ post().likedBy.length }}
      </button>

      @if (permissions.canEdit()) {
        <button type="button" (click)="permissions.edit()">Edit</button>
      }
    </article>
  `,
})
export class PostCardComponent {
  readonly post = input.required<Post>();

  protected readonly like = injectPostLike(this.post);
  protected readonly permissions = injectPostPermissions(this.post);
}
