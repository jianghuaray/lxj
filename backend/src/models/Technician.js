const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Technician = sequelize.define('Technician', {
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
  specialties: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  commission_rate: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: false,
    defaultValue: 0.30
  },
  status: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 1,
    comment: '1-启用，0-禁用'
  },
  remark: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'technicians',
  underscored: true
});

module.exports = Technician;
