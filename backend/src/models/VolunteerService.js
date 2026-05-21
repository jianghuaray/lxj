const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const VolunteerService = sequelize.define('VolunteerService', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  volunteerId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'volunteer_id',
    index: true
  },
  serviceDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'service_date'
  },
  serviceContent: {
    type: DataTypes.STRING(200),
    allowNull: false,
    field: 'service_content'
  },
  serviceDuration: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'service_duration'
  },
  serviceCommunity: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'service_community'
  }
}, {
  tableName: 'volunteer_services',
  underscored: true
});

module.exports = VolunteerService;
