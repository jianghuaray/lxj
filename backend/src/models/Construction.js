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
  order_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  share_base_amount: {
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
  received_amount: {
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
  technician_rate: {
    type: DataTypes.DECIMAL(5, 4),
    allowNull: true
  },
  technician_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  property_id: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  property_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  property_rate: {
    type: DataTypes.DECIMAL(5, 4),
    allowNull: true
  },
  property_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  building_manager_id: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  building_manager_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  building_manager_rate: {
    type: DataTypes.DECIMAL(5, 4),
    allowNull: true
  },
  building_manager_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  building_manager_incentive: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  company_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  collection_party: {
    type: DataTypes.ENUM('technician', 'property', 'company', 'other'),
    allowNull: true
  },
  technician_settlement_status: {
    type: DataTypes.ENUM('unsettled', 'settled'),
    allowNull: false,
    defaultValue: 'unsettled'
  },
  property_settlement_status: {
    type: DataTypes.ENUM('unsettled', 'settled'),
    allowNull: false,
    defaultValue: 'unsettled'
  },
  building_manager_settlement_status: {
    type: DataTypes.ENUM('unsettled', 'settled'),
    allowNull: false,
    defaultValue: 'unsettled'
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
  underscored: true,
  indexes: [
    { fields: ['order_id'] },
    { fields: ['technician_id'] },
    { fields: ['created_at'] }
  ]
});

module.exports = Construction;
