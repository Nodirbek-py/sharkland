const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Product = sequelize.define('Product', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    stock: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
    unitType: {
        type: DataTypes.ENUM('pcs', 'kg', 'liters', 'portions'),
        allowNull: false,
        defaultValue: 'pcs'
    },
    category: {
        type: DataTypes.ENUM('bar', 'cafe', 'restaurant', 'store', 'ride'),
        allowNull: false
    },
    vendorUsername: {
        type: DataTypes.STRING,
        allowNull: false
    }
});

module.exports = Product;