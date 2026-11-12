import { computed, inject, Injectable, Signal, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Post } from '../../01-domain-functions/a-companion-object/post';
import { PostsStore } from '../../02-store-organisation/c-store-features/posts.store';
import { SessionStore } from '../../shared/session.store';

// Option C: a service provided per component (`providers: [PostViewService]`).
// Same logic as the inject functions in option D, plus the ceremony a class needs:
// it can't see the component's input(), so the component has to connect() it,
// and until then every member has to cope with "no post yet".
@Injectable()
export class PostViewService {
  private readonly postsStore = inject(PostsStore);
  private readonly sessionStore = inject(SessionStore);
  private readonly router = inject(Router);

  private readonly postSource = signal<Signal<Post> | undefined>(undefined);
  private readonly post = computed(() => this.postSource()?.());

  readonly isLiked = computed(() => {
    const post = this.post();
    const viewer = this.sessionStore.currentUser();
    return post !== undefined && viewer !== null && Post.isLikedBy(post, viewer);
  });

  readonly canEdit = computed(() => {
    const post = this.post();
    const viewer = this.sessionStore.currentUser();
    return post !== undefined && viewer !== null && Post.isEditableBy(post, viewer);
  });

  connect(post: Signal<Post>): this {
    this.postSource.set(post);
    return this;
  }

  toggleLike(): void {
    const post = this.post();
    const viewer = this.sessionStore.currentUser();
    if (post === undefined) {
      return;
    }
    if (viewer === null) {
      void this.router.navigate(['/sign-in']);
      return;
    }
    void this.postsStore.toggleLike(post.id, viewer);
  }

  edit(): void {
    const post = this.post();
    if (post === undefined) {
      return;
    }
    void this.router.navigate(['/posts', post.id, 'edit']);
  }
}
