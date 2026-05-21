const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ApprovalHistory = sequelize.define('ApprovalHistory', {
  request_id: { type: DataTypes.INTEGER, allowNull: false },
  approver_id: { type: DataTypes.INTEGER, allowNull: false },
  stage: { type: DataTypes.STRING, allowNull: false },
  action: { type: DataTypes.STRING, allowNull: false }, // APPROVE, REJECT, SEND_BACK
  comments: { type: DataTypes.TEXT },
  timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'approval_history',
  timestamps: false
});

module.exports = ApprovalHistory;
