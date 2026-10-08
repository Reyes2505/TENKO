export function formatTikTokCount(count: number): string {
  if (count >= 1_000_000) {
    return (count / 1_000_000).toFixed(1).replace('.', ',') + ' M';
  }
  if (count >= 1_000) {
    return (count / 1_000).toFixed(1).replace('.', ',') + ' mil';
  }
  return count.toString();
}
