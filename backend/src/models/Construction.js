const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Construction = sequelize.define('Construction', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  order_id: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  technician_id: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  total_fee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  service_fee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  received_fee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  material_cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  commission_rate: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true
  },
  building_manager_incentive: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  actual_work: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  dispatch_remark: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  dispatched_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  started_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'constructions',
  underscored: true
});

module.exports = Construction;
