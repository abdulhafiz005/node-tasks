exports.PostResource = (post) => ({
  id: post.id,
  content: post.content,
  platform: post.platform,
  posted_at: post.posted_at
});