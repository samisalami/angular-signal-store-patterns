import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Post } from '../../01-domain-functions/a-companion-object/post';
import { PostsApi } from '../../shared/posts-api';
import type { User } from '../../shared/user';
import { PostsStore as InlinePostsStore } from '../a-inline-store/posts.store';
import { PostsStore as MethodFactoriesPostsStore } from '../b-method-factories/posts.store';
import { PostsStore as StoreFeaturesPostsStore } from '../c-store-features/posts.store';
import { PostsStore as FeatureCallbacksPostsStore } from '../d-feature-callbacks/posts.store';

// The four options organise the code differently but build the same store.
// One spec, run against all four, shows that from the outside there is no difference:
// a store is used through its signals and its methods, nothing else.

const INLINE_OPTION_LABEL = 'A: inline store';
const METHOD_FACTORIES_OPTION_LABEL = 'B: method factories';
const STORE_FEATURES_OPTION_LABEL = 'C: store features';
const FEATURE_CALLBACKS_OPTION_LABEL = 'D: feature callbacks';

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

describe.each([
  { optionLabel: INLINE_OPTION_LABEL, PostsStore: InlinePostsStore },
  { optionLabel: METHOD_FACTORIES_OPTION_LABEL, PostsStore: MethodFactoriesPostsStore },
  { optionLabel: STORE_FEATURES_OPTION_LABEL, PostsStore: StoreFeaturesPostsStore },
  { optionLabel: FEATURE_CALLBACKS_OPTION_LABEL, PostsStore: FeatureCallbacksPostsStore },
])('PostsStore ($optionLabel)', ({ PostsStore }) => {
  let reader: User;
  let publishedPost: Post;
  let draftPost: Post;
  let postsApi: { fetchAll: ReturnType<typeof vi.fn>; updateLikes: ReturnType<typeof vi.fn> };

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
  });

  describe('loading', () => {
    it('should load all posts when the store is created', async () => {
      const postsStore = TestBed.inject(PostsStore);

      await vi.waitFor(() => expect(postsStore.isFulfilled()).toBe(true));

      expect(postsStore.entities()).toEqual([publishedPost, draftPost]);
    });

    it('should offer published posts and drafts as separate lists', async () => {
      const postsStore = TestBed.inject(PostsStore);

      await vi.waitFor(() => expect(postsStore.isFulfilled()).toBe(true));

      expect(postsStore.publishedPosts()).toEqual([publishedPost]);
      expect(postsStore.drafts()).toEqual([draftPost]);
    });

    it('should report the error when loading fails', async () => {
      postsApi.fetchAll.mockReturnValue(throwError(() => SERVER_ERROR_LABEL));

      const postsStore = TestBed.inject(PostsStore);

      await vi.waitFor(() => expect(postsStore.error()).toBe(SERVER_ERROR_LABEL));
      expect(postsStore.isPending()).toBe(false);
    });

    it('should load again when loadAll is called after a failure', async () => {
      postsApi.fetchAll.mockReturnValueOnce(throwError(() => SERVER_ERROR_LABEL));
      const postsStore = TestBed.inject(PostsStore);
      await vi.waitFor(() => expect(postsStore.error()).toBe(SERVER_ERROR_LABEL));

      await postsStore.loadAll();

      expect(postsStore.error()).toBeNull();
      expect(postsStore.entities()).toEqual([publishedPost, draftPost]);
    });
  });

  describe('liking', () => {
    it('should show the like before the server has answered', async () => {
      const serverAnswer = new Subject<Post>();
      postsApi.updateLikes.mockReturnValue(serverAnswer);
      const postsStore = TestBed.inject(PostsStore);
      await vi.waitFor(() => expect(postsStore.isFulfilled()).toBe(true));

      void postsStore.toggleLike(PUBLISHED_POST_ID, reader);

      expect(postsStore.entityMap()[PUBLISHED_POST_ID].likedBy).toEqual([READER_ID]);
    });

    it('should send the new list of likers to the server', async () => {
      const postsStore = TestBed.inject(PostsStore);
      await vi.waitFor(() => expect(postsStore.isFulfilled()).toBe(true));

      await postsStore.toggleLike(PUBLISHED_POST_ID, reader);

      expect(postsApi.updateLikes).toHaveBeenCalledWith(PUBLISHED_POST_ID, [READER_ID]);
    });

    it('should take the like back when the server rejects it', async () => {
      postsApi.updateLikes.mockReturnValue(throwError(() => SERVER_ERROR_LABEL));
      const postsStore = TestBed.inject(PostsStore);
      await vi.waitFor(() => expect(postsStore.isFulfilled()).toBe(true));

      await postsStore.toggleLike(PUBLISHED_POST_ID, reader);

      expect(postsStore.entityMap()[PUBLISHED_POST_ID].likedBy).toEqual([]);
    });
  });
});
