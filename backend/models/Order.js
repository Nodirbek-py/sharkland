const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const OrderItem = require('./OrderItem');

const Order = sequelize.define('Order', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tableNumber: { type: DataTypes.STRING, allowNull: false },
    location: { type: DataTypes.STRING, allowNull: false }, // masalan: 'Hovuz Markazi'
    totalAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    status: {
        type: DataTypes.ENUM('pending', 'paid'),
        allowNull: false,
        defaultValue: 'pending'
    },
    waiterUsername: { type: DataTypes.STRING, allowNull: false }
});


module.exports = Order;