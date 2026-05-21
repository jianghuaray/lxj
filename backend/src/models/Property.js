const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Property = sequelize.define('Property', {
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
  default_collection_party: {
    type: DataTypes.ENUM('technician', 'property', 'company', 'other'),
    allowNull: false,
    defaultValue: 'technician'
  },
  settlement_cycle: {
    type: DataTypes.ENUM('current', 'half_month', 'monthly'),
    allowNull: false,
    defaultValue: 'monthly'
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
  tableName: 'properties',
  underscored: true,
  indexes: [
    { fields: ['name'] },
    { fields: ['status'] }
  ]
});

module.exports = Property;
