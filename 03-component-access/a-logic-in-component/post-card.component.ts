import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { Post } from '../../01-domain-functions/a-companion-object/post';
import { PostsStore } from '../../02-store-organisation/c-store-features/posts.store';
import { SessionStore } from '../../shared/session.store';

// Option A: the component does it all.
// Fine for one component. The feed row and the moderation row need the same
// isLiked / canEdit / toggleLike logic -> copy and paste, or a base class.
@Component({
  selector: 'app-post-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article>
      <h2>{{ post().title }}</h2>
      <p>{{ post().body }}</p>

      <button type="button" [attr.aria-pressed]="isLiked()" (click)="toggleLike()">
        ♥ {{ post().likedBy.length }}
      </button>

      @if (canEdit()) {
        <button type="button" (click)="edit()">Edit</button>
      }
    </article>
  `,
})
export class PostCardComponent {
  readonly post = input.required<Post>();

  private readonly postsStore = inject(PostsStore);
  private readonly sessionStore = inject(SessionStore);
  private readonly router = inject(Router);

  protected readonly isLiked = computed(() => {
    const viewer = this.sessionStore.currentUser();
    return viewer !== null && Post.isLikedBy(this.post(), viewer);
  });

  protected readonly canEdit = computed(() => {
    const viewer = this.sessionStore.currentUser();
    return viewer !== null && Post.isEditableBy(this.post(), viewer);
  });

  protected toggleLike(): void {
    const viewer = this.sessionStore.currentUser();
    if (viewer === null) {
      void this.router.navigate(['/sign-in']);
      return;
    }
    void this.postsStore.toggleLike(this.post().id, viewer);
  }

  protected edit(): void {
    void this.router.navigate(['/posts', this.post().id, 'edit']);
  }
}
