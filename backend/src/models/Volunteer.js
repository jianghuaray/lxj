const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Volunteer = sequelize.define('Volunteer', {
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
  age: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  gender: {
    type: DataTypes.ENUM('male', 'female'),
    allowNull: false
  },
  politicalStatus: {
    type: DataTypes.ENUM('mass', 'party', 'league', 'other'),
    allowNull: false,
    field: 'political_status'
  },
  community: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  address: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  specialty: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  serviceIntention: {
    type: DataTypes.STRING(200),
    allowNull: true,
    field: 'service_intention'
  }
}, {
  tableName: 'volunteers',
  underscored: true
});

module.exports = Volunteer;
