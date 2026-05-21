const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BuildingManager = sequelize.define('BuildingManager', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  default_rate: {
    type: DataTypes.DECIMAL(5, 4),
    allowNull: false,
    defaultValue: 0
  },
  status: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 1
  },
  remark: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'building_managers',
  underscored: true,
  indexes: [
    { fields: ['name'] },
    { fields: ['status'] }
  ]
});

module.exports = BuildingManager;
