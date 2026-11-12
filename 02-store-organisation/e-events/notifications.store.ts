import { signalStore, withState } from '@ngrx/signals';
import { on, withReducer } from '@ngrx/signals/events';
import { postsApiEvents } from './posts.events';

// A second store that reacts to the same events as PostsStore.
// Neither store knows the other, and nobody who dispatches knows either of them.
// With methods, someone would have to call `notificationsStore.add(…)` at every place
// a like can fail.
//
// A store only hears events while it exists: this one is created the first time
// something injects it.
export const NotificationsStore = signalStore(
  { providedIn: 'root' },
  withState<{ messages: string[] }>({ messages: [] }),
  withReducer(
    on(postsApiEvents.loadFailed, ({ payload: error }, state) => ({
      messages: [...state.messages, `Could not load posts: ${error}`],
    })),
    on(postsApiEvents.likeRejected, (_, state) => ({
      messages: [...state.messages, 'Your like could not be saved.'],
    })),
  ),
);
