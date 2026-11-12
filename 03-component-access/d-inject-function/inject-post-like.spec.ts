import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Post } from '../../01-domain-functions/a-companion-object/post';
import { PostsStore } from '../../02-store-organisation/c-store-features/posts.store';
import { PostsApi } from '../../shared/posts-api';
import { SessionStore } from '../../shared/session.store';
import type { User } from '../../shared/user';
import { injectPostLike } from './inject-post-like';

// An inject function is tested like it is used: called inside an injection context.
// No component, no template.

const POST_ID = 'post-1';
const AUTHOR_ID = 'user-author';
const READER_ID = 'user-reader';
const READER_NAME_LABEL = 'Rita Reader';
const POST_TITLE_LABEL = 'Signal stores without the sprawl';
const POST_BODY_LABEL = 'Keep the store short, keep the logic close to the data.';
const PUBLISHED_AT = '2026-11-01T09:00:00.000Z';

describe('injectPostLike', () => {
  let reader: User;
  let post: WritableSignal<Post>;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let postsStore: InstanceType<typeof PostsStore>;
  let sessionStore: InstanceType<typeof SessionStore>;

  beforeEach(async () => {
    reader = { id: READER_ID, name: READER_NAME_LABEL, role: 'member' };
    post = signal<Post>({
      id: POST_ID,
      authorId: AUTHOR_ID,
      title: POST_TITLE_LABEL,
      body: POST_BODY_LABEL,
      publishedAt: PUBLISHED_AT,
      likedBy: [],
    });
    router = { navigate: vi.fn(() => Promise.resolve(true)) };
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        {
          provide: PostsApi,
          useValue: {
            fetchAll: () => of([post()]),
            updateLikes: (postId: string, likedBy: string[]) => of({ ...post(), id: postId, likedBy }),
          },
        },
      ],
    });
    postsStore = TestBed.inject(PostsStore);
    sessionStore = TestBed.inject(SessionStore);
    await vi.waitFor(() => expect(postsStore.isFulfilled()).toBe(true));
  });

  it('should report the post as not liked when nobody is signed in', () => {
    post.update((currentPost) => ({ ...currentPost, likedBy: [READER_ID] }));

    const like = TestBed.runInInjectionContext(() => injectPostLike(post));

    expect(like.isLiked()).toBe(false);
  });

  it('should report the post as liked when the signed-in user is among the likers', () => {
    sessionStore.signIn(reader);
    post.update((currentPost) => ({ ...currentPost, likedBy: [READER_ID] }));

    const like = TestBed.runInInjectionContext(() => injectPostLike(post));

    expect(like.isLiked()).toBe(true);
  });

  it('should follow the input when it switches to another version of the post', () => {
    sessionStore.signIn(reader);
    const like = TestBed.runInInjectionContext(() => injectPostLike(post));

    post.update((currentPost) => ({ ...currentPost, likedBy: [READER_ID] }));

    expect(like.isLiked()).toBe(true);
  });

  it('should send an anonymous user to sign in instead of liking', () => {
    const like = TestBed.runInInjectionContext(() => injectPostLike(post));

    like.toggleLike();

    expect(router.navigate).toHaveBeenCalledWith(['/sign-in']);
    expect(postsStore.entityMap()[POST_ID].likedBy).toEqual([]);
  });

  it('should like the post in the store as the signed-in user', () => {
    sessionStore.signIn(reader);
    const like = TestBed.runInInjectionContext(() => injectPostLike(post));

    like.toggleLike();

    expect(postsStore.entityMap()[POST_ID].likedBy).toEqual([READER_ID]);
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
