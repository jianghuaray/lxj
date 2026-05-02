const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CallbackRecord = sequelize.define('CallbackRecord', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  order_id: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  is_satisfied: {
    type: DataTypes.TINYINT,
    allowNull: true,
    comment: '1-满意，0-不满意'
  },
  satisfaction_score: {
    type: DataTypes.TINYINT,
    allowNull: true,
    comment: '1-5分'
  },
  fee_consistent: {
    type: DataTypes.TINYINT,
    allowNull: true,
    comment: '1-一致，0-不一致'
  },
  callback_method: {
    type: DataTypes.ENUM('phone', 'wechat', 'visit'),
    allowNull: true
  },
  callback_by: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  other_feedback: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  callback_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'callback_records',
  underscored: true
});

module.exports = CallbackRecord;
