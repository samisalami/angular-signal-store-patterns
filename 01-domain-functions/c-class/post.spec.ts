import { beforeEach, describe, expect, it } from 'vitest';
import type { User } from '../../shared/user';
import { Post, PostJson } from './post';

const POST_ID = 'post-1';
const AUTHOR_ID = 'user-author';
const READER_ID = 'user-reader';
const AUTHOR_NAME_LABEL = 'Ada Author';
const READER_NAME_LABEL = 'Rita Reader';
const POST_TITLE_LABEL = 'Signal stores without the sprawl';
const POST_BODY_LABEL = 'Keep the store short, keep the logic close to the data.';
const PUBLISHED_AT = '2026-11-01T09:00:00.000Z';

describe('Post (class)', () => {
  let author: User;
  let reader: User;
  let publishedPostJson: PostJson;
  let publishedPost: Post;

  beforeEach(() => {
    author = { id: AUTHOR_ID, name: AUTHOR_NAME_LABEL, role: 'member' };
    reader = { id: READER_ID, name: READER_NAME_LABEL, role: 'member' };
    publishedPostJson = {
      id: POST_ID,
      authorId: AUTHOR_ID,
      title: POST_TITLE_LABEL,
      body: POST_BODY_LABEL,
      publishedAt: PUBLISHED_AT,
      likedBy: [],
    };
    publishedPost = Post.fromJson(publishedPostJson);
  });

  describe('behaviour', () => {
    it('should let the author edit their own post', () => {
      expect(publishedPost.isEditableBy(author)).toBe(true);
    });

    it('should not let another member edit the post', () => {
      expect(publishedPost.isEditableBy(reader)).toBe(false);
    });

    it('should add the user to likedBy when they have not liked the post yet', () => {
      const likedPost = publishedPost.toggleLike(reader);

      expect(likedPost.likedBy).toEqual([READER_ID]);
      expect(likedPost.isLikedBy(reader)).toBe(true);
    });
  });

  // Why this option is discouraged: these all pass, and each one is a bug waiting to happen.
  describe('pitfalls', () => {
    it('should lose its methods when it is copied with a spread', () => {
      const copiedPost = { ...publishedPost };

      expect('isDraft' in copiedPost).toBe(false);
    });

    it('should lose its methods after a JSON round trip', () => {
      const restoredPost = JSON.parse(JSON.stringify(publishedPost));

      expect(restoredPost.title).toBe(POST_TITLE_LABEL);
      expect(restoredPost.isDraft).toBeUndefined();
    });

    it('should not be an instance when server data is used without fromJson', () => {
      const postFromServer: unknown = publishedPostJson;

      expect(postFromServer instanceof Post).toBe(false);
    });
  });
});
