import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { injectDispatch } from '@ngrx/signals/events';
import { NotificationsStore } from './notifications.store';
import { postsViewEvents } from './posts.events';
import { PostsStore } from './posts.store';

// Reading is the same as with methods. Writing is different:
// the view does not tell the store what to do, it announces what happened.
@Component({
  selector: 'app-posts-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <h2>Posts</h2>

      @if (postsStore.isPending()) {
        <p>Loading posts…</p>
      }

      @if (postsStore.error(); as error) {
        <p role="alert">Could not load posts: {{ error }}</p>
        <button type="button" (click)="dispatch.retryClicked()">Retry</button>
      }

      @if (postsStore.isFulfilled()) {
        <p>{{ postsStore.publishedPosts().length }} published, {{ postsStore.drafts().length }} drafts</p>
      }

      <ul aria-label="Notifications">
        @for (message of notificationsStore.messages(); track $index) {
          <li>{{ message }}</li>
        }
      </ul>
    </section>
  `,
})
export class PostsOverviewComponent {
  protected readonly postsStore = inject(PostsStore);
  protected readonly notificationsStore = inject(NotificationsStore);
  protected readonly dispatch = injectDispatch(postsViewEvents);

  constructor() {
    this.dispatch.opened();
  }
}
