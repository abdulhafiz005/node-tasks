const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { validatePost } = require('../validators/postValidator');
const { store, index } = require('../controllers/PostController');
const { register, login } = require('../controllers/AuthController');
const { validationResult } = require('express-validator');

router.post('/register', register);
router.post('/login', login);

router.post('/posts', auth, validatePost, (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  next();
}, store);

router.get('/posts', auth, index);

module.exports = router;
