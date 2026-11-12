import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Post } from './post';

@Injectable({ providedIn: 'root' })
export class PostsApi {
  private readonly http = inject(HttpClient);

  fetchAll(): Observable<Post[]> {
    return this.http.get<Post[]>('/api/posts');
  }

  updateLikes(postId: string, likedBy: string[]): Observable<Post> {
    return this.http.patch<Post>(`/api/posts/${postId}`, { likedBy });
  }
}
