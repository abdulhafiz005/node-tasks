const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Post', {
    content: DataTypes.TEXT,
    platform: {
      type: DataTypes.ENUM('facebook', 'twitter', 'instagram'),
      allowNull: false
    },
    posted_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  });
};