const { Sequelize } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../../database.sqlite'),
  logging: false,
});

sequelize.authenticate()
  .then(() => console.log('Successfully connected to SQLite database'))
  .catch(err => console.error('Unable to connect to the database:', err));

module.exports = {
  sequelize,
  query: async (text, params) => {
    const results = await sequelize.query(text, { 
      replacements: params, 
      type: Sequelize.QueryTypes.SELECT 
    });
    return results; // Sequelize return array directly for SELECT
  },
  execute: async (text, params) => {
    return sequelize.query(text, { replacements: params });
  }
};
