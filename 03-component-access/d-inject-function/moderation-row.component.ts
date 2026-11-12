import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Post } from '../../01-domain-functions/a-companion-object/post';
import { injectPostPermissions } from './inject-post-permissions';

// A row in the moderation table: title, draft flag and edit action, no liking
// -> only the permissions concern. Again a new view, no new inject function.
@Component({
  selector: 'app-moderation-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <tr>
      <td>{{ post().title }}</td>
      <td>{{ statusLabel() }}</td>
      <td>
        @if (permissions.canEdit()) {
          <button type="button" (click)="permissions.edit()">Edit</button>
        }
      </td>
    </tr>
  `,
})
export class ModerationRowComponent {
  readonly post = input.required<Post>();

  // Only this view shows a status label, so the computed stays here.
  // The rule itself (what makes a post a draft) still comes from the domain function.
  protected readonly statusLabel = computed(() => (Post.isDraft(this.post()) ? 'Draft' : 'Published'));
  protected readonly permissions = injectPostPermissions(this.post);
}
