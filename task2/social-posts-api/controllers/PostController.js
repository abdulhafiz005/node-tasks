const { Post } = require('../models');
const { PostResource } = require('../resources/PostResource');

exports.store = async (req, res) => {
  const { content, platform } = req.body;
  const post = await Post.create({
    user_id: req.user.id,
    content,
    platform
  });
  res.json(PostResource(post));
};

exports.index = async (req, res) => {
  const where = { user_id: req.user.id };
  if (req.query.platform) where.platform = req.query.platform;
  const posts = await Post.findAll({ where, order: [['posted_at', 'DESC']] });
  res.json(posts.map(PostResource));
};