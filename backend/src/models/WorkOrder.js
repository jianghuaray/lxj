const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WorkOrder = sequelize.define('WorkOrder', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  order_no: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'dispatched', 'completed', 'callback', 'cancelled', 'consultation'),
    allowNull: false,
    defaultValue: 'pending'
  },
  customer_id: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  customer_name: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  customer_phone: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  area: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  address: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  source_channel: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  problem_category: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  problem_description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  receiver_id: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  received_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  receiver_remark: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  cancel_reason: {
    type: DataTypes.STRING(100),
    allowNull: true
  }
}, {
  tableName: 'work_orders',
  underscored: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['customer_id'] },
    { fields: ['receiver_id'] },
    { fields: ['area'] },
    { fields: ['problem_category'] },
    { fields: ['completed_at'] },
    { fields: ['created_at'] },
    { fields: ['status', 'created_at'] }
  ]
});

module.exports = WorkOrder;
