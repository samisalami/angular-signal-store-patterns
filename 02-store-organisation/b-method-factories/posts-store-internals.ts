import { Signal } from '@angular/core';
import { WritableStateSource } from '@ngrx/signals';
import { EntityMap, EntityState } from '@ngrx/signals/entities';
import { Post } from '../../01-domain-functions/a-companion-object/post';
import { RequestStatusState } from '../../shared/with-request-status';

// The price of option B: a hand-written copy of what `store` looks like inside withMethods.
// NgRx only knows this type after the store is built, so the factories can't get it from there.
// Nothing keeps it in sync with posts.store.ts -> add state or a computed there, update it here too.
export type PostsStoreInternals = WritableStateSource<EntityState<Post> & RequestStatusState> & {
  entityMap: Signal<EntityMap<Post>>;
};
