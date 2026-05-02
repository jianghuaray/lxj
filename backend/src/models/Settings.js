const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Settings = sequelize.define('Settings', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'serviceTypes, areas, channels, cancelReasons'
  },
  values: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: 'Array of string values'
  }
}, {
  tableName: 'settings',
  underscored: true
});

module.exports = Settings;
