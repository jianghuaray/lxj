const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Customer = sequelize.define('Customer', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  area: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  address: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  level: {
    type: DataTypes.ENUM('normal', 'vip', 'blacklist'),
    allowNull: false,
    defaultValue: 'normal'
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  remark: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  source_channel: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  total_orders: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  last_order_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'customers',
  underscored: true
});

module.exports = Customer;
