import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Post } from '../../01-domain-functions/a-companion-object/post';
import { PostsStore } from '../../02-store-organisation/c-store-features/posts.store';
import { injectPostPermissions } from './inject-post-permissions';

// A row in the moderation table: title, draft flag and edit action, no liking
// -> only the permissions concern. Again a new view, no new inject function.
@Component({
  selector: 'app-moderation-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (post(); as post) {
      <tr>
        <td>{{ post.title }}</td>
        <td>{{ isDraft() ? 'Draft' : 'Published' }}</td>
        <td>
          @if (permissions.canEdit()) {
            <button type="button" (click)="permissions.edit()">Edit</button>
          }
        </td>
      </tr>
    }
  `,
})
export class ModerationRowComponent {
  readonly postId = input.required<string>();

  private readonly postsStore = inject(PostsStore);

  protected readonly post = computed<Post | undefined>(() => this.postsStore.entityMap()[this.postId()]);
  // view-specific and trivial -> stays in the component, on top of a domain function
  protected readonly isDraft = computed(() => {
    const currentPost = this.post();
    return currentPost !== undefined && Post.isDraft(currentPost);
  });
  protected readonly permissions = injectPostPermissions(this.postId);
}
