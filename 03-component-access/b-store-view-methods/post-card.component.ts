import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Post } from '../../01-domain-functions/a-companion-object/post';
import { PostsStore } from './posts.store';

// The component is thin, but only because the store has grown methods
// that exist for this kind of view alone.
@Component({
  selector: 'app-post-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article>
      <h2>{{ post().title }}</h2>
      <p>{{ post().body }}</p>

      <button
        type="button"
        [attr.aria-pressed]="postsStore.isLikedByViewer(post())"
        (click)="postsStore.toggleLikeAsViewer(post())"
      >
        ♥ {{ post().likedBy.length }}
      </button>

      @if (postsStore.canViewerEdit(post())) {
        <button type="button" (click)="postsStore.editPost(post())">Edit</button>
      }
    </article>
  `,
})
export class PostCardComponent {
  readonly post = input.required<Post>();

  protected readonly postsStore = inject(PostsStore);
}
