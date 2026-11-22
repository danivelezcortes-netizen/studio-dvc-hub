import type { PostView } from './types';

export function placementClass(post: Pick<PostView, 'placement'>): string {
  if (post.placement === 'grid') return 'pill-grid';
  if (post.placement === 'not_on_grid') return 'pill-trial';
  return '';
}
