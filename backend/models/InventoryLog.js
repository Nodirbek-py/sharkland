const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const InventoryLog = sequelize.define('InventoryLog', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    storekeeperUsername: { type: DataTypes.STRING, allowNull: false },
    actionType: {
        type: DataTypes.ENUM('Yaratildi', 'Yangilandi', 'O\'chirildi'),
        allowNull: false
    },
    productName: { type: DataTypes.STRING, allowNull: false },
    details: { type: DataTypes.STRING, allowNull: false }
});

module.exports = InventoryLog;
