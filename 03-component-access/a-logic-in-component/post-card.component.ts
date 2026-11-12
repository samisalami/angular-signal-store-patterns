import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { Post } from '../../01-domain-functions/a-companion-object/post';
import { PostsStore } from '../../02-store-organisation/c-store-features/posts.store';
import { SessionStore } from '../../shared/session.store';

// Option A: the component does it all.
// Fine for one component. The post detail page and the post list row need the same
// isLiked / canEdit / toggleLike logic -> copy and paste, or a base class.
@Component({
  selector: 'app-post-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (post(); as post) {
      <article>
        <h2>{{ post.title }}</h2>
        <p>{{ post.body }}</p>

        <button type="button" [attr.aria-pressed]="isLiked()" (click)="toggleLike()">
          ♥ {{ likeCount() }}
        </button>

        @if (canEdit()) {
          <button type="button" (click)="edit()">Edit</button>
        }
      </article>
    }
  `,
})
export class PostCardComponent {
  readonly postId = input.required<string>();

  private readonly postsStore = inject(PostsStore);
  private readonly sessionStore = inject(SessionStore);
  private readonly router = inject(Router);

  protected readonly post = computed<Post | undefined>(() => this.postsStore.entityMap()[this.postId()]);

  protected readonly isLiked = computed(() => {
    const currentPost = this.post();
    const viewer = this.sessionStore.currentUser();
    return currentPost !== undefined && viewer !== null && Post.isLikedBy(currentPost, viewer);
  });

  protected readonly canEdit = computed(() => {
    const currentPost = this.post();
    const viewer = this.sessionStore.currentUser();
    return currentPost !== undefined && viewer !== null && Post.isEditableBy(currentPost, viewer);
  });

  protected readonly likeCount = computed(() => this.post()?.likedBy.length ?? 0);

  protected toggleLike(): void {
    const viewer = this.sessionStore.currentUser();
    if (viewer === null) {
      void this.router.navigate(['/sign-in']);
      return;
    }
    void this.postsStore.toggleLike(this.postId(), viewer);
  }

  protected edit(): void {
    void this.router.navigate(['/posts', this.postId(), 'edit']);
  }
}
