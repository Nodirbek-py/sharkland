const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const OrderItem = sequelize.define('OrderItem', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    vendorUsername: { type: DataTypes.STRING, allowNull: false },
    quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    priceAtPurchase: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    productId: { type: DataTypes.UUID, allowNull: true },
    storeId: { type: DataTypes.UUID, allowNull: false },
    isPaid: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    isPrepared: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
});

module.exports = OrderItem;