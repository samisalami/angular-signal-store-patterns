import { computed, inject, Injectable, Signal, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Post } from '../../01-domain-functions/a-companion-object/post';
import { PostsStore } from '../../02-store-organisation/c-store-features/posts.store';
import { SessionStore } from '../../shared/session.store';

// Option C: a service provided per component (`providers: [PostViewService]`).
// Same logic as the inject function in option D, plus the ceremony a class needs:
// it can't see the component's input(), so the component has to connect() it.
@Injectable()
export class PostViewService {
  private readonly postsStore = inject(PostsStore);
  private readonly sessionStore = inject(SessionStore);
  private readonly router = inject(Router);

  private readonly postIdSource = signal<Signal<string> | undefined>(undefined);
  private readonly postId = computed(() => this.postIdSource()?.());

  readonly post = computed<Post | undefined>(() => {
    const postId = this.postId();
    return postId === undefined ? undefined : this.postsStore.entityMap()[postId];
  });

  readonly isLiked = computed(() => {
    const currentPost = this.post();
    const viewer = this.sessionStore.currentUser();
    return currentPost !== undefined && viewer !== null && Post.isLikedBy(currentPost, viewer);
  });

  readonly canEdit = computed(() => {
    const currentPost = this.post();
    const viewer = this.sessionStore.currentUser();
    return currentPost !== undefined && viewer !== null && Post.isEditableBy(currentPost, viewer);
  });

  readonly likeCount = computed(() => this.post()?.likedBy.length ?? 0);

  connect(postId: Signal<string>): this {
    this.postIdSource.set(postId);
    return this;
  }

  toggleLike(): void {
    const postId = this.postId();
    const viewer = this.sessionStore.currentUser();
    if (postId === undefined) {
      return;
    }
    if (viewer === null) {
      void this.router.navigate(['/sign-in']);
      return;
    }
    void this.postsStore.toggleLike(postId, viewer);
  }

  edit(): void {
    const postId = this.postId();
    if (postId === undefined) {
      return;
    }
    void this.router.navigate(['/posts', postId, 'edit']);
  }
}
