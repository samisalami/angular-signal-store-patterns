import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import { Post } from '../../01-domain-functions/a-companion-object/post';
import { User } from '../../shared/user';

// Events are named facts: something that happened, in the past tense.
// They say nothing about what should happen next. That is up to whoever listens.

// what a view can announce
export const postsViewEvents = eventGroup({
  source: 'Posts View',
  events: {
    opened: type<void>(),
    retryClicked: type<void>(),
    likeToggled: type<{ postId: string; user: User }>(),
  },
});

// what the server answered
export const postsApiEvents = eventGroup({
  source: 'Posts API',
  events: {
    loaded: type<Post[]>(),
    loadFailed: type<string>(),
    likeRejected: type<{ postId: string; user: User }>(),
  },
});
