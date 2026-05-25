const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Visitor = sequelize.define('Visitor', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: false },
    nfcCardId: { type: DataTypes.STRING, allowNull: false, unique: true },
    balance: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 }
});

module.exports = Visitor;