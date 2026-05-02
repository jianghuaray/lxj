const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Complaint = sequelize.define('Complaint', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  order_id: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  source: {
    type: DataTypes.ENUM('direct', 'callback'),
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  handler_id: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'resolved', 'closed'),
    allowNull: false,
    defaultValue: 'pending'
  },
  result: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  resolved_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'complaints',
  underscored: true
});

module.exports = Complaint;
