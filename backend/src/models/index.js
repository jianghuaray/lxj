const sequelize = require('../config/database')

const User = require('./User');
const Customer = require('./Customer');
const Technician = require('./Technician');
const WorkOrder = require('./WorkOrder');
const Construction = require('./Construction');
const CallbackRecord = require('./CallbackRecord');
const Complaint = require('./Complaint');
const Settings = require('./Settings');
const OperationLog = require('./OperationLog');

// 定义模型关联

// 用户与工单的关系
User.hasMany(WorkOrder, { foreignKey: 'receiver_id', as: 'receivedOrders' });
WorkOrder.belongsTo(User, { foreignKey: 'receiver_id', as: 'receiver' });

// 用户与投诉的关系
User.hasMany(Complaint, { foreignKey: 'handler_id', as: 'handledComplaints' });
Complaint.belongsTo(User, { foreignKey: 'handler_id', as: 'handler' });

// 用户与回访记录的关系
User.hasMany(CallbackRecord, { foreignKey: 'callback_by', as: 'callbacks' });
CallbackRecord.belongsTo(User, { foreignKey: 'callback_by', as: 'callbackUser' });

// 客户与工单的关系
Customer.hasMany(WorkOrder, { foreignKey: 'customer_id', as: 'orders' });
WorkOrder.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

// 师傅与施工记录的关系
Technician.hasMany(Construction, { foreignKey: 'technician_id', as: 'constructions' });
Construction.belongsTo(Technician, { foreignKey: 'technician_id', as: 'technician' });

// 工单与施工记录的关系
WorkOrder.hasOne(Construction, { foreignKey: 'order_id', as: 'construction' });
Construction.belongsTo(WorkOrder, { foreignKey: 'order_id', as: 'order' });

// 工单与回访记录的关系
WorkOrder.hasOne(CallbackRecord, { foreignKey: 'order_id', as: 'callback' });
CallbackRecord.belongsTo(WorkOrder, { foreignKey: 'order_id', as: 'order' });

// 工单与投诉的关系
WorkOrder.hasMany(Complaint, { foreignKey: 'order_id', as: 'complaints' });
Complaint.belongsTo(WorkOrder, { foreignKey: 'order_id', as: 'order' });

// 用户与操作日志的关系
User.hasMany(OperationLog, { foreignKey: 'operator_id', as: 'operationLogs' });
OperationLog.belongsTo(User, { foreignKey: 'operator_id', as: 'operator' });

module.exports = {
  sequelize,
  User,
  Customer,
  Technician,
  WorkOrder,
  Construction,
  CallbackRecord,
  Complaint,
  Settings,
  OperationLog
};
