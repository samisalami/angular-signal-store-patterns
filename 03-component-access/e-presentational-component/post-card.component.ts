import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Post } from '../../01-domain-functions/a-companion-object/post';

// Option E: a presentational ("dumb") component. Inputs in, outputs out, no inject() at all.
// It is trivially reusable and testable, because it knows nothing: not who is signed in,
// not what liking does, not where editing leads. All of that moves up into every parent.
@Component({
  selector: 'app-post-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article>
      <h2>{{ post().title }}</h2>
      <p>{{ post().body }}</p>

      <button type="button" [attr.aria-pressed]="isLiked()" (click)="likeToggled.emit()">
        ♥ {{ post().likedBy.length }}
      </button>

      @if (canEdit()) {
        <button type="button" (click)="editRequested.emit()">Edit</button>
      }
    </article>
  `,
})
export class PostCardComponent {
  readonly post = input.required<Post>();
  readonly isLiked = input.required<boolean>();
  readonly canEdit = input.required<boolean>();

  readonly likeToggled = output<void>();
  readonly editRequested = output<void>();
}
