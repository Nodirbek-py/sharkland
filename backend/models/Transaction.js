const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Visitor = require('./Visitor');

const Transaction = sequelize.define('Transaction', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    type: { type: DataTypes.ENUM('topup', 'expense'), allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    location: { type: DataTypes.STRING, allowNull: false },
    storeId: {
        type: DataTypes.UUID,
        allowNull: true, // Nullable for general top-ups at reception
        references: { model: 'Stores', key: 'id' }
    }
});

// Defining structural links
Visitor.hasMany(Transaction, { foreignKey: 'visitorId', onDelete: 'CASCADE' });
Transaction.belongsTo(Visitor, { foreignKey: 'visitorId' });

module.exports = Transaction;