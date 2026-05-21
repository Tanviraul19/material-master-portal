const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const sequelize = new Sequelize({
  dialect: process.env.DB_DIALECT || 'sqlite',
  storage: process.env.DB_STORAGE || './database.sqlite',
  logging: false,
});

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  username: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { 
    type: DataTypes.ENUM(
      'ADMIN', 'USER', 'PLANT_HEAD', 'DEPT_TEAM', 'PURCHASE_TEAM', 'GST_TEAM', 'STORE_HEAD', 'IT_TEAM'
    ), 
    allowNull: false 
  },
  department: { type: DataTypes.STRING },
});

const MaterialRequest = sequelize.define('MaterialRequest', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  material_type: { type: DataTypes.STRING, allowNull: false },
  plant: { type: DataTypes.STRING, allowNull: false },
  storage_location: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.STRING(40), allowNull: false },
  normalized_description: { type: DataTypes.STRING(40), allowNull: false },
  long_description: { type: DataTypes.STRING(200), allowNull: false },
  uom: { type: DataTypes.STRING, allowNull: false },
  purchase_group: { type: DataTypes.STRING, allowNull: false },
  material_group: { type: DataTypes.STRING },
  control_code: { type: DataTypes.STRING },
  valuation_category: { type: DataTypes.STRING },
  valuation_class: { type: DataTypes.STRING },
  department: { type: DataTypes.STRING },
  status: { 
    type: DataTypes.STRING, 
    defaultValue: 'PENDING_PLANT_HEAD' 
  },
  current_approver_role: { type: DataTypes.STRING },
});

const ApprovalHistory = sequelize.define('ApprovalHistory', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  action: { type: DataTypes.STRING, allowNull: false },
  remarks: { type: DataTypes.TEXT },
  role: { type: DataTypes.STRING },
});

// Associations
User.hasMany(MaterialRequest, { as: 'Requests', foreignKey: 'created_by' });
MaterialRequest.belongsTo(User, { as: 'Creator', foreignKey: 'created_by' });

MaterialRequest.hasMany(ApprovalHistory, { as: 'History', foreignKey: 'request_id' });
ApprovalHistory.belongsTo(MaterialRequest, { foreignKey: 'request_id' });

ApprovalHistory.belongsTo(User, { as: 'Actor', foreignKey: 'actor_id' });

module.exports = { sequelize, User, MaterialRequest, ApprovalHistory };
