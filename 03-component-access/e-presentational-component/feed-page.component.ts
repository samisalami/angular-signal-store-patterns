import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Post } from '../../01-domain-functions/a-companion-object/post';
import { PostsStore } from '../../02-store-organisation/c-store-features/posts.store';
import { SessionStore } from '../../shared/session.store';
import { PostCardComponent } from './post-card.component';

// The container ("smart") side of option E. The card is dumb, so the page has to know
// everything the card needs: who is signed in, the like rule, the edit rule, both actions.
// The post detail page shows the same card and would repeat all of it.
@Component({
  selector: 'app-feed-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PostCardComponent],
  template: `
    <h1>Feed</h1>

    @for (post of postsStore.publishedPosts(); track post.id) {
      <app-post-card
        [post]="post"
        [isLiked]="isLiked(post)"
        [canEdit]="canEdit(post)"
        (likeToggled)="toggleLike(post)"
        (editRequested)="edit(post)"
      />
    }
  `,
})
export class FeedPageComponent {
  protected readonly postsStore = inject(PostsStore);
  private readonly sessionStore = inject(SessionStore);
  private readonly router = inject(Router);

  protected isLiked(post: Post): boolean {
    const viewer = this.sessionStore.currentUser();
    return viewer !== null && Post.isLikedBy(post, viewer);
  }

  protected canEdit(post: Post): boolean {
    const viewer = this.sessionStore.currentUser();
    return viewer !== null && Post.isEditableBy(post, viewer);
  }

  protected toggleLike(post: Post): void {
    const viewer = this.sessionStore.currentUser();
    if (viewer === null) {
      void this.router.navigate(['/sign-in']);
      return;
    }
    void this.postsStore.toggleLike(post.id, viewer);
  }

  protected edit(post: Post): void {
    void this.router.navigate(['/posts', post.id, 'edit']);
  }
}
