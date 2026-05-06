const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PointRecord = sequelize.define('PointRecord', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  customerId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'customer_id'
  },
  type: {
    type: DataTypes.ENUM('earn', 'spend'),
    allowNull: false
  },
  points: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  orderId: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'order_id'
  },
  exchangeItem: {
    type: DataTypes.STRING(200),
    allowNull: true,
    field: 'exchange_item'
  },
  reason: {
    type: DataTypes.STRING(200),
    allowNull: true
  }
}, {
  tableName: 'point_records',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = PointRecord;