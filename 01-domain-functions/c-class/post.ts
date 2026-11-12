import { User } from '../../shared/user';

// What the server sends and what JSON.parse returns: plain data, no methods.
export type PostJson = {
  id: string;
  authorId: string;
  title: string;
  body: string;
  publishedAt: string | null;
  likedBy: string[];
};

// Option C: the classic OOP model. Data and behaviour in one class.
// Reads nicely (`post.isDraft()`), but the methods live on the prototype, and everything
// that copies or serialises a post drops the prototype -> see post.spec.ts.
export class Post {
  constructor(
    readonly id: string,
    readonly authorId: string,
    readonly title: string,
    readonly body: string,
    readonly publishedAt: string | null,
    readonly likedBy: readonly string[],
  ) {}

  // every post that enters the app has to go through this
  static fromJson(json: PostJson): Post {
    return new Post(json.id, json.authorId, json.title, json.body, json.publishedAt, json.likedBy);
  }

  isDraft(): boolean {
    return this.publishedAt === null;
  }

  isEditableBy(user: User): boolean {
    return this.authorId === user.id || User.isAdmin(user);
  }

  isLikedBy(user: User): boolean {
    return this.likedBy.includes(user.id);
  }

  toggleLike(user: User): Post {
    const likedBy = this.isLikedBy(user)
      ? this.likedBy.filter((likerId) => likerId !== user.id)
      : [...this.likedBy, user.id];
    return new Post(this.id, this.authorId, this.title, this.body, this.publishedAt, likedBy);
  }
}
