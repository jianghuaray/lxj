const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OperationLog = sequelize.define('OperationLog', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  detail: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  operator_id: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  operator_name: {
    type: DataTypes.STRING(50),
    allowNull: true
  }
}, {
  tableName: 'operation_logs',
  underscored: true,
  indexes: [
    { fields: ['operator_id'] },
    { fields: ['action'] },
    { fields: ['created_at'] }
  ]
});

module.exports = OperationLog;
