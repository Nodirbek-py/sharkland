const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const OrderItem = require('./OrderItem');

const Order = sequelize.define('Order', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tableNumber: { type: DataTypes.STRING, allowNull: false },
    location: { type: DataTypes.STRING, allowNull: false }, // masalan: 'Hovuz Markazi'
    totalAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    netTotalAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    tipAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    hasTip: { type: DataTypes.BOOLEAN, defaultValue: false },
    status: {
        type: DataTypes.ENUM('pending', 'paid', 'canceled'),
        allowNull: false,
        defaultValue: 'pending'
    },
    waiterUsername: { type: DataTypes.STRING, allowNull: false },
    storeId: {
        type: DataTypes.UUID,
        allowNull: true, // Nullable for general top-ups at reception
        references: { model: 'Stores', key: 'id' }
    }
});


module.exports = Order;