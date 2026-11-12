import { User } from '../users/user';

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

// Domain functions for Post: the behaviour of the data type itself.
// No Angular, no store, no DI -> usable from stores, components, inject functions and tests alike.
export const Post = {
  isDraft(post: Post): boolean {
    return post.publishedAt === null;
  },

  isEditableBy(post: Post, user: User): boolean {
    return post.authorId === user.id || User.isAdmin(user);
  },

  isLikedBy(post: Post, user: User): boolean {
    return post.likedBy.includes(user.id);
  },

  toggleLike(post: Post, user: User): Post {
    const likedBy = Post.isLikedBy(post, user)
      ? post.likedBy.filter((likerId) => likerId !== user.id)
      : [...post.likedBy, user.id];
    return { ...post, likedBy };
  },
};
