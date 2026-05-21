const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const MaterialRequest = sequelize.define('MaterialRequest', {
  req_number: { type: DataTypes.STRING, unique: true, allowNull: false },
  requester_id: { type: DataTypes.INTEGER },
  material_type: { type: DataTypes.STRING, allowNull: false },
  plant: { type: DataTypes.STRING, allowNull: false },
  storage_location: { type: DataTypes.STRING, allowNull: false },
  material_name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.STRING(40), allowNull: false },
  long_description: { type: DataTypes.TEXT },
  uom: { type: DataTypes.STRING, allowNull: false },
  purchase_group: { type: DataTypes.STRING },
  material_group: { type: DataTypes.STRING },
  control_code: { type: DataTypes.STRING },
  valuation_category: { type: DataTypes.STRING },
  valuation_class: { type: DataTypes.STRING },
  department: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING, defaultValue: 'Pending Plant Head' },
  current_stage: { type: DataTypes.STRING, defaultValue: 'Plant Head' },
  priority: { type: DataTypes.STRING, defaultValue: 'Medium' }
}, {
  tableName: 'material_requests',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = MaterialRequest;
