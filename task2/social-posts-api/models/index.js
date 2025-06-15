const { Sequelize } = require('sequelize');
const sequelize = new Sequelize({ dialect: 'sqlite', storage: './database.sqlite' });

const User = require('./User')(sequelize);
const Post = require('./Post')(sequelize);

User.hasMany(Post, { foreignKey: 'user_id' });
Post.belongsTo(User, { foreignKey: 'user_id' });

module.exports = { sequelize, User, Post };