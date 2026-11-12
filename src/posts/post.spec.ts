import { beforeEach, describe, expect, it } from 'vitest';
import type { User } from '../users/user';
import { Post } from './post';

const POST_ID = 'post-1';
const AUTHOR_ID = 'user-author';
const READER_ID = 'user-reader';
const ADMIN_ID = 'user-admin';
const AUTHOR_NAME_LABEL = 'Ada Author';
const READER_NAME_LABEL = 'Rita Reader';
const ADMIN_NAME_LABEL = 'Alan Admin';
const POST_TITLE_LABEL = 'Signal stores without the sprawl';
const POST_BODY_LABEL = 'Keep the store short, keep the logic close to the data.';
const PUBLISHED_AT = '2026-11-01T09:00:00.000Z';

describe('Post', () => {
  let author: User;
  let reader: User;
  let admin: User;
  let publishedPost: Post;

  beforeEach(() => {
    author = { id: AUTHOR_ID, name: AUTHOR_NAME_LABEL, role: 'member' };
    reader = { id: READER_ID, name: READER_NAME_LABEL, role: 'member' };
    admin = { id: ADMIN_ID, name: ADMIN_NAME_LABEL, role: 'admin' };
    publishedPost = {
      id: POST_ID,
      authorId: AUTHOR_ID,
      title: POST_TITLE_LABEL,
      body: POST_BODY_LABEL,
      publishedAt: PUBLISHED_AT,
      likedBy: [],
    };
  });

  describe('isDraft', () => {
    it('should treat a post without a publish date as a draft', () => {
      const draftPost: Post = { ...publishedPost, publishedAt: null };

      expect(Post.isDraft(draftPost)).toBe(true);
    });

    it('should not treat a published post as a draft', () => {
      expect(Post.isDraft(publishedPost)).toBe(false);
    });
  });

  describe('isEditableBy', () => {
    it('should let the author edit their own post', () => {
      expect(Post.isEditableBy(publishedPost, author)).toBe(true);
    });

    it('should let an admin edit a post they did not write', () => {
      expect(Post.isEditableBy(publishedPost, admin)).toBe(true);
    });

    it('should not let another member edit the post', () => {
      expect(Post.isEditableBy(publishedPost, reader)).toBe(false);
    });
  });

  describe('toggleLike', () => {
    it('should add the user to likedBy when they have not liked the post yet', () => {
      const likedPost = Post.toggleLike(publishedPost, reader);

      expect(likedPost.likedBy).toEqual([READER_ID]);
      expect(Post.isLikedBy(likedPost, reader)).toBe(true);
    });

    it('should remove the user from likedBy when they already liked the post', () => {
      const likedPost: Post = { ...publishedPost, likedBy: [READER_ID, ADMIN_ID] };

      const unlikedPost = Post.toggleLike(likedPost, reader);

      expect(unlikedPost.likedBy).toEqual([ADMIN_ID]);
      expect(Post.isLikedBy(unlikedPost, reader)).toBe(false);
    });

    it('should leave the original post unchanged', () => {
      Post.toggleLike(publishedPost, reader);

      expect(publishedPost.likedBy).toEqual([]);
    });
  });
});
