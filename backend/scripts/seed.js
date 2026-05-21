const bcrypt = require('bcryptjs');
const { sequelize, User } = require('../models');

const seed = async () => {
  await sequelize.sync({ force: true });

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('Admin@123', salt);

  await User.create({
    name: 'Saurabh',
    email: 'saurabh@example.com',
    username: 'saurabh',
    password: hashedPassword,
    role: 'ADMIN'
  });

  await User.create({
    name: 'Komal',
    email: 'komal@example.com',
    username: 'komal',
    password: hashedPassword,
    role: 'ADMIN'
  });

  // Create a few test users for other roles
  const userPassword = await bcrypt.hash('User@123', salt);
  await User.create({
    name: 'Plant Head Deepak',
    email: 'deepak@example.com',
    username: 'deepak',
    password: userPassword,
    role: 'PLANT_HEAD',
    department: 'Mechanical'
  });

  await User.create({
    name: 'IT Admin',
    email: 'it@example.com',
    username: 'it_admin',
    password: userPassword,
    role: 'IT_TEAM'
  });

  console.log('Seeding completed!');
  process.exit();
};

seed();
