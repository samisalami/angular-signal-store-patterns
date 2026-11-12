export type UserRole = 'member' | 'admin';

export type User = {
  id: string;
  name: string;
  role: UserRole;
};

// Domain functions for User: pure, no Angular, no store.
export const User = {
  isAdmin(user: User): boolean {
    return user.role === 'admin';
  },
};
