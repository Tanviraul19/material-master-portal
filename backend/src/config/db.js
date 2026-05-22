'use strict';
const { Sequelize } = require('sequelize');
const path = require('path');

let sequelize;

if (process.env.DATABASE_URL) {
  // PostgreSQL — Render production
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false },
    },
    logging: false,
  });
  console.log('✅ Using PostgreSQL (production)');
} else {
  // SQLite — local development
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../../database.sqlite'),
    logging: false,
  });
  console.log('✅ Using SQLite (development)');
}

sequelize.authenticate()
  .then(() => console.log('✅ Database connected'))
  .catch(err => console.error('❌ Database connection failed:', err));

module.exports = {
  sequelize,
  query: async (text, params) => {
    const results = await sequelize.query(text, {
      replacements: params,
      type: Sequelize.QueryTypes.SELECT,
    });
    return results;
  },
  execute: async (text, params) => {
    return sequelize.query(text, { replacements: params });
  },
};
