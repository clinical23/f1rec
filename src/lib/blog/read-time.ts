export function calculateReadTime(content: string): number {
  const wordsPerMinute = 250
  const wordCount = content.trim().split(/\s+/).length
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute))
}
