/**
 * Shared HTML escaping, avatar constants & relative time formatting for LifeQuest views.
 */

export const PLAYER_AVATARS = ['🛡️', '⚔️', '🧙', '🦊', '🦉', '🐉', '🌟', '🏹', '🧭', '🌿', '🔥', '👑'];

export function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatRelativeTime(timestamp) {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const d = new Date(timestamp);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
