const { Sequelize } = require('sequelize');
require('dotenv').config();

// 1. Birinchi bo'lib obyektni yaratamiz (Modellardan mutlaqo mustaqil holatda)
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
});

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('PostgreSQL Database connected successfully.');

        // 2. MODELLARNI FAQAT SHU YERDA - BAZA ULANGANIDAN KEYIN CHAQIRAMIZ!
        const Visitor = require('../models/Visitor');
        const Product = require('../models/Product');
        const Transaction = require('../models/Transaction');
        const Order = require('../models/Order');
        const OrderItem = require('../models/OrderItem');

        // 3. Model munosabatlarini (Associations) o'rnatamiz
        Transaction.hasMany(OrderItem, { foreignKey: 'transactionId', onDelete: 'CASCADE' });
        OrderItem.belongsTo(Transaction, { foreignKey: 'transactionId' });

        Product.hasMany(OrderItem, { foreignKey: 'productId' });
        OrderItem.belongsTo(Product, { foreignKey: 'productId' });

        Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'OrderItems', onDelete: 'CASCADE' });
        OrderItem.belongsTo(Order, { foreignKey: 'orderId' });

        // 4. Strukturani sinxronizatsiya qilamiz
        await sequelize.sync({ force: true });
        console.log('Database schema structures synchronized.');

    } catch (error) {
        console.error('Database connection failed:', error.message);
        process.exit(1);
    }
};

module.exports = { sequelize, connectDB };