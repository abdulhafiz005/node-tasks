const { body } = require('express-validator');

exports.validatePost = [
  body('content').isString().notEmpty(),
  body('platform').isIn(['facebook', 'twitter', 'instagram'])
];