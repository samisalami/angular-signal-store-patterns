import { User } from '../../shared/user';

export type Post = {
  id: string;
  authorId: string;
  title: string;
  body: string;
  // ISO date; null -> the post is still a draft
  publishedAt: string | null;
  // ids of the users who liked the post
  likedBy: string[];
};

// Same domain functions as option A, but as plain exports.
// Callers import the whole module as a namespace: `import * as Post from './post'`.

export function isDraft(post: Post): boolean {
  return post.publishedAt === null;
}

export function isEditableBy(post: Post, user: User): boolean {
  return post.authorId === user.id || User.isAdmin(user);
}

export function isLikedBy(post: Post, user: User): boolean {
  return post.likedBy.includes(user.id);
}

export function toggleLike(post: Post, user: User): Post {
  const likedBy = isLikedBy(post, user)
    ? post.likedBy.filter((likerId) => likerId !== user.id)
    : [...post.likedBy, user.id];
  return { ...post, likedBy };
}
