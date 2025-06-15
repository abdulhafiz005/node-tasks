const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('User', {
    email: { type: DataTypes.STRING, unique: true },
    password: DataTypes.STRING
  });
};