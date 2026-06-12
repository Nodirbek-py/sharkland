const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Store = require('../models/Store');
const Order = require('../models/Order'); // NEW
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');

// --- STORES ---
router.post('/stores', async (req, res) => {
    try {
        const { name } = req.body;
        const store = await Store.create({ name });
        res.status(201).json({ message: "Store created successfully!", store });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/stores', async (req, res) => {
    try {
        const stores = await Store.findAll();
        res.json(stores);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- USERS ---
router.post('/users', async (req, res) => {
    try {
        const { username, password, role, storeId } = req.body;

        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) return res.status(400).json({ message: "Username is taken!" });

        const hashedPassword = await bcrypt.hash(password, 10);

        // Receptionists, waiters, storekeepers don't need a storeId
        let finalStoreId = (role === 'receptionist' || role === 'superadmin' || role === 'waiter' || role === 'storekeeper') ? null : storeId;
        
        if (finalStoreId === "") finalStoreId = null;
        if (!finalStoreId && role === 'barman') {
            return res.status(400).json({ message: "Vendor (Filial xodimi) uchun filial tanlanishi majburiy!" });
        }

        const newUser = await User.create({
            username,
            password: hashedPassword,
            role,
            storeId: finalStoreId
        });

        res.status(201).json({ message: "User created!", user: { id: newUser.id, username, role } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/users', async (req, res) => {
    try {
        const { role } = req.query;
        let whereClause = {};
        if (role) {
            whereClause.role = role;
        }
        const users = await User.findAll({ 
            where: whereClause,
            attributes: ['id', 'username', 'role', 'storeId']
        });
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/transactions', async (req, res) => {
    try {
        const transactions = await Transaction.findAll({ order: [['createdAt', 'DESC']] });
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ANALYTICS & STORE COMPARISON ---
router.get('/analytics', async (req, res) => {
    try {
        const { period, startDate, endDate, storeId, waiterUsername } = req.query;

        let start, end;
        const now = new Date();

        if (startDate && endDate) {
            start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
        } else {
            start = new Date();
            start.setHours(0, 0, 0, 0);
            end = new Date();
            if (period === 'weekly') {
                start.setDate(start.getDate() - start.getDay());
            } else if (period === 'monthly') {
                start = new Date(start.getFullYear(), start.getMonth(), 1);
            }
        }

        let txs = [];
        let orders = [];

        if (waiterUsername) {
            orders = await Order.findAll({ 
                where: { 
                    waiterUsername, 
                    status: 'paid',
                    createdAt: { [Op.between]: [start, end] }
                } 
            });
        } else {
            let txWhere = { type: 'expense', createdAt: { [Op.between]: [start, end] } };
            if (storeId) {
                txWhere.storeId = storeId;
            }
            txs = await Transaction.findAll({ where: txWhere });
        }

        const stores = await Store.findAll();

        let totalIncome = 0;
        if (waiterUsername) {
            totalIncome = orders.reduce((s, o) => s + Number(o.totalAmount), 0);
        } else {
            totalIncome = txs.reduce((s, t) => s + Number(t.amount), 0);
        }

        let storeComparison = [];
        if (!waiterUsername && !storeId) {
            storeComparison = stores.map(store => {
                const storeSales = txs.filter(t => t.storeId === store.id);
                return {
                    storeName: store.name,
                    totalSales: storeSales.reduce((sum, t) => sum + Number(t.amount), 0),
                    dailySales: storeSales.filter(t => {
                        const d = new Date(t.createdAt);
                        const today = new Date(); today.setHours(0,0,0,0);
                        return d >= today;
                    }).reduce((sum, t) => sum + Number(t.amount), 0)
                };
            });
        }

        let chartData = [];
        
        const getSum = (t_start, t_end) => {
            if (waiterUsername) {
                return orders.filter(o => {
                    const d = new Date(o.createdAt);
                    return d >= t_start && d < t_end;
                }).reduce((s, o) => s + Number(o.totalAmount), 0);
            } else {
                return txs.filter(t => {
                    const d = new Date(t.createdAt);
                    return d >= t_start && d < t_end;
                }).reduce((s, t) => s + Number(t.amount), 0);
            }
        };

        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

        if (diffDays <= 1) {
            for (let i = 0; i <= 23; i++) {
                const t_start = new Date(start); t_start.setHours(i, 0, 0, 0);
                const t_end = new Date(start); t_end.setHours(i + 1, 0, 0, 0);
                chartData.push({ label: `${i}:00`, daromad: getSum(t_start, t_end) });
            }
        } else if (diffDays <= 31) {
            for (let i = 0; i < diffDays; i++) {
                const t_start = new Date(start); t_start.setDate(t_start.getDate() + i); t_start.setHours(0, 0, 0, 0);
                const t_end = new Date(t_start); t_end.setDate(t_end.getDate() + 1);
                chartData.push({ label: `${t_start.getDate()}/${t_start.getMonth()+1}`, daromad: getSum(t_start, t_end) });
            }
        } else {
            const startMonth = start.getMonth();
            const endMonth = end.getMonth() + (end.getFullYear() - start.getFullYear()) * 12;
            for (let i = startMonth; i <= endMonth; i++) {
                const t_start = new Date(start.getFullYear(), i, 1);
                const t_end = new Date(start.getFullYear(), i + 1, 1);
                chartData.push({ label: `${t_start.getMonth()+1}/${t_start.getFullYear()}`, daromad: getSum(t_start, t_end) });
            }
        }

        const getStartOfDay = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
        const getStartOfWeek = () => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); return d; };
        const getStartOfMonth = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); };

        let dailyIncome = 0, weeklyIncome = 0, monthlyIncome = 0;
        if (!waiterUsername && !storeId && (!startDate && !endDate)) {
            const allTxs = await Transaction.findAll({ where: { type: 'expense' } });
            dailyIncome = allTxs.filter(t => new Date(t.createdAt) >= getStartOfDay()).reduce((s, t) => s + Number(t.amount), 0);
            weeklyIncome = allTxs.filter(t => new Date(t.createdAt) >= getStartOfWeek()).reduce((s, t) => s + Number(t.amount), 0);
            monthlyIncome = allTxs.filter(t => new Date(t.createdAt) >= getStartOfMonth()).reduce((s, t) => s + Number(t.amount), 0);
        }

        res.json({
            summary: { 
                dailyIncome: (!waiterUsername && !storeId && !startDate) ? dailyIncome : totalIncome, 
                weeklyIncome: (!waiterUsername && !storeId && !startDate) ? weeklyIncome : 0, 
                monthlyIncome: (!waiterUsername && !storeId && !startDate) ? monthlyIncome : 0,
                totalIncome
            },
            storeComparison,
            chartData
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;