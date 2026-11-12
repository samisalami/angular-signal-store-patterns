import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Events, injectDispatch } from '@ngrx/signals/events';
import { filter } from 'rxjs';
import { Post } from '../../01-domain-functions/a-companion-object/post';
import { User } from '../../shared/user';
import { postsApiEvents, postsViewEvents } from './posts.events';

// A component that both dispatches an event and reacts to one.
// The "could not save" hint is a passing UI reaction that belongs to this button alone,
// so it is not state in any store: the button listens for the rejection of its own post.
// Every like button on screen does the same, each for its own post.
@Component({
  selector: 'app-post-like-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" (click)="toggle()">♥ {{ post().likedBy.length }}</button>

    @if (wasRejected()) {
      <span role="status">Could not save your like</span>
    }
  `,
})
export class PostLikeButtonComponent {
  readonly post = input.required<Post>();
  readonly user = input.required<User>();

  protected readonly wasRejected = signal(false);

  private readonly dispatch = injectDispatch(postsViewEvents);

  constructor() {
    inject(Events)
      .on(postsApiEvents.likeRejected)
      .pipe(
        filter(({ payload }) => payload.postId === this.post().id),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.wasRejected.set(true));
  }

  protected toggle(): void {
    this.wasRejected.set(false);
    this.dispatch.likeToggled({ postId: this.post().id, user: this.user() });
  }
}
