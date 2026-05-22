const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Visitor = require('./Visitor');

const Transaction = sequelize.define('Transaction', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    type: { type: DataTypes.ENUM('topup', 'expense'), allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    location: { type: DataTypes.STRING, allowNull: false }
});

// Defining structural links
Visitor.hasMany(Transaction, { foreignKey: 'visitorId', onDelete: 'CASCADE' });
Transaction.belongsTo(Visitor, { foreignKey: 'visitorId' });

module.exports = Transaction;