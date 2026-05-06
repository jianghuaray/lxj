const sequelize = require('../config/database')

const User = require('./User');
const Customer = require('./Customer');
const Technician = require('./Technician');
const WorkOrder = require('./WorkOrder');
const Construction = require('./Construction');
const CallbackRecord = require('./CallbackRecord');
const Volunteer = require('./Volunteer');
const VolunteerService = require('./VolunteerService');
const Settings = require('./Settings');
const OperationLog = require('./OperationLog');
const PointRecord = require('./PointRecord');

// 定义模型关联

// 用户与工单的关系
User.hasMany(WorkOrder, { foreignKey: 'receiver_id', as: 'receivedOrders', onDelete: 'SET NULL' });
WorkOrder.belongsTo(User, { foreignKey: 'receiver_id', as: 'receiver', onDelete: 'SET NULL' });

// 用户与回访记录的关系
User.hasMany(CallbackRecord, { foreignKey: 'callback_by', as: 'callbacks', onDelete: 'SET NULL' });
CallbackRecord.belongsTo(User, { foreignKey: 'callback_by', as: 'callbackUser', onDelete: 'SET NULL' });

// 客户与工单的关系
Customer.hasMany(WorkOrder, { foreignKey: 'customer_id', as: 'orders', onDelete: 'SET NULL' });
WorkOrder.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer', onDelete: 'SET NULL' });

// 师傅与施工记录的关系
Technician.hasMany(Construction, { foreignKey: 'technician_id', as: 'constructions', onDelete: 'RESTRICT' });
Construction.belongsTo(Technician, { foreignKey: 'technician_id', as: 'technician', onDelete: 'RESTRICT' });

// 工单与施工记录的关系
WorkOrder.hasOne(Construction, { foreignKey: 'order_id', as: 'construction', onDelete: 'CASCADE' });
Construction.belongsTo(WorkOrder, { foreignKey: 'order_id', as: 'order', onDelete: 'CASCADE' });

// 工单与回访记录的关系
WorkOrder.hasOne(CallbackRecord, { foreignKey: 'order_id', as: 'callback', onDelete: 'CASCADE' });
CallbackRecord.belongsTo(WorkOrder, { foreignKey: 'order_id', as: 'order', onDelete: 'CASCADE' });

// 用户与操作日志的关系
User.hasMany(OperationLog, { foreignKey: 'operator_id', as: 'operationLogs', onDelete: 'SET NULL' });
OperationLog.belongsTo(User, { foreignKey: 'operator_id', as: 'operator', onDelete: 'SET NULL' });

// 志愿者与服务记录的关系
Volunteer.hasMany(VolunteerService, { foreignKey: 'volunteer_id', as: 'services', onDelete: 'CASCADE' });
VolunteerService.belongsTo(Volunteer, { foreignKey: 'volunteer_id', as: 'volunteer', onDelete: 'CASCADE' });

// 客户与积分记录的关系
Customer.hasMany(PointRecord, { foreignKey: 'customer_id', as: 'pointRecords', onDelete: 'CASCADE' });
PointRecord.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer', onDelete: 'CASCADE' });

module.exports = {
  sequelize,
  User,
  Customer,
  Technician,
  WorkOrder,
  Construction,
  CallbackRecord,
  Volunteer,
  VolunteerService,
  Settings,
  OperationLog,
  PointRecord
};
