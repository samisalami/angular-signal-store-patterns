import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Post } from '../../01-domain-functions/a-companion-object/post';
import { PostsApi } from '../../shared/posts-api';
import type { User } from '../../shared/user';
import { NotificationsStore } from './notifications.store';
import { postsViewEvents } from './posts.events';
import { PostsStore } from './posts.store';

// The event-driven store is used differently from options A-D (dispatch instead of
// method calls), so it has its own spec. The behaviour it checks is the same.

const PUBLISHED_POST_ID = 'post-published';
const DRAFT_POST_ID = 'post-draft';
const AUTHOR_ID = 'user-author';
const READER_ID = 'user-reader';
const READER_NAME_LABEL = 'Rita Reader';
const PUBLISHED_POST_TITLE_LABEL = 'Signal stores without the sprawl';
const DRAFT_POST_TITLE_LABEL = 'Unfinished thoughts';
const POST_BODY_LABEL = 'Keep the store short, keep the logic close to the data.';
const PUBLISHED_AT = '2026-11-01T09:00:00.000Z';
const SERVER_ERROR_LABEL = 'Server unavailable';
const LIKE_REJECTED_MESSAGE_LABEL = 'Your like could not be saved.';
const LOAD_FAILED_MESSAGE_LABEL = `Could not load posts: ${SERVER_ERROR_LABEL}`;

describe('PostsStore (E: events)', () => {
  let reader: User;
  let publishedPost: Post;
  let draftPost: Post;
  let postsApi: { fetchAll: ReturnType<typeof vi.fn>; updateLikes: ReturnType<typeof vi.fn> };
  let postsStore: InstanceType<typeof PostsStore>;
  let notificationsStore: InstanceType<typeof NotificationsStore>;
  let dispatcher: Dispatcher;

  beforeEach(() => {
    reader = { id: READER_ID, name: READER_NAME_LABEL, role: 'member' };
    publishedPost = {
      id: PUBLISHED_POST_ID,
      authorId: AUTHOR_ID,
      title: PUBLISHED_POST_TITLE_LABEL,
      body: POST_BODY_LABEL,
      publishedAt: PUBLISHED_AT,
      likedBy: [],
    };
    draftPost = {
      id: DRAFT_POST_ID,
      authorId: AUTHOR_ID,
      title: DRAFT_POST_TITLE_LABEL,
      body: POST_BODY_LABEL,
      publishedAt: null,
      likedBy: [],
    };
    postsApi = {
      fetchAll: vi.fn(() => of([publishedPost, draftPost])),
      updateLikes: vi.fn((postId: string, likedBy: string[]) => of({ ...publishedPost, id: postId, likedBy })),
    };
    TestBed.configureTestingModule({ providers: [{ provide: PostsApi, useValue: postsApi }] });
    postsStore = TestBed.inject(PostsStore);
    notificationsStore = TestBed.inject(NotificationsStore);
    dispatcher = TestBed.inject(Dispatcher);
  });

  describe('loading', () => {
    it('should not load anything before a view has opened', () => {
      expect(postsApi.fetchAll).not.toHaveBeenCalled();
      expect(postsStore.entities()).toEqual([]);
    });

    it('should load all posts when a view opens', () => {
      dispatcher.dispatch(postsViewEvents.opened());

      expect(postsStore.isFulfilled()).toBe(true);
      expect(postsStore.publishedPosts()).toEqual([publishedPost]);
      expect(postsStore.drafts()).toEqual([draftPost]);
    });

    it('should be pending while the server has not answered', () => {
      postsApi.fetchAll.mockReturnValue(new Subject<Post[]>());

      dispatcher.dispatch(postsViewEvents.opened());

      expect(postsStore.isPending()).toBe(true);
    });

    it('should report the error when loading fails', () => {
      postsApi.fetchAll.mockReturnValue(throwError(() => SERVER_ERROR_LABEL));

      dispatcher.dispatch(postsViewEvents.opened());

      expect(postsStore.error()).toBe(SERVER_ERROR_LABEL);
    });

    it('should load again when retry is clicked after a failure', () => {
      postsApi.fetchAll.mockReturnValueOnce(throwError(() => SERVER_ERROR_LABEL));
      dispatcher.dispatch(postsViewEvents.opened());

      dispatcher.dispatch(postsViewEvents.retryClicked());

      expect(postsStore.error()).toBeNull();
      expect(postsStore.entities()).toEqual([publishedPost, draftPost]);
    });
  });

  describe('liking', () => {
    beforeEach(() => {
      dispatcher.dispatch(postsViewEvents.opened());
    });

    it('should show the like before the server has answered', () => {
      postsApi.updateLikes.mockReturnValue(new Subject<Post>());

      dispatcher.dispatch(postsViewEvents.likeToggled({ postId: PUBLISHED_POST_ID, user: reader }));

      expect(postsStore.entityMap()[PUBLISHED_POST_ID].likedBy).toEqual([READER_ID]);
    });

    it('should send the new list of likers to the server', () => {
      dispatcher.dispatch(postsViewEvents.likeToggled({ postId: PUBLISHED_POST_ID, user: reader }));

      expect(postsApi.updateLikes).toHaveBeenCalledWith(PUBLISHED_POST_ID, [READER_ID]);
    });

    it('should take the like back when the server rejects it', () => {
      postsApi.updateLikes.mockReturnValue(throwError(() => SERVER_ERROR_LABEL));

      dispatcher.dispatch(postsViewEvents.likeToggled({ postId: PUBLISHED_POST_ID, user: reader }));

      expect(postsStore.entityMap()[PUBLISHED_POST_ID].likedBy).toEqual([]);
    });
  });

  // The reason to use events at all: a second store reacts, and nothing above had to change for it.
  describe('a second store reacting to the same events', () => {
    it('should add a notification when the server rejects a like', () => {
      postsApi.updateLikes.mockReturnValue(throwError(() => SERVER_ERROR_LABEL));
      dispatcher.dispatch(postsViewEvents.opened());

      dispatcher.dispatch(postsViewEvents.likeToggled({ postId: PUBLISHED_POST_ID, user: reader }));

      expect(notificationsStore.messages()).toEqual([LIKE_REJECTED_MESSAGE_LABEL]);
    });

    it('should add a notification when loading fails', () => {
      postsApi.fetchAll.mockReturnValue(throwError(() => SERVER_ERROR_LABEL));

      dispatcher.dispatch(postsViewEvents.opened());

      expect(notificationsStore.messages()).toEqual([LOAD_FAILED_MESSAGE_LABEL]);
    });

    it('should stay empty while everything succeeds', () => {
      dispatcher.dispatch(postsViewEvents.opened());
      dispatcher.dispatch(postsViewEvents.likeToggled({ postId: PUBLISHED_POST_ID, user: reader }));

      expect(notificationsStore.messages()).toEqual([]);
    });
  });
});
