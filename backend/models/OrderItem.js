const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Product = require('./Product');
const Order = require('./Order'); // Order modelini chaqirish


const OrderItem = sequelize.define('OrderItem', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    vendorUsername: { type: DataTypes.STRING, allowNull: false },
    quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    priceAtPurchase: { type: DataTypes.DECIMAL(10, 2), allowNull: false }
});


module.exports = OrderItem;