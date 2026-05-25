const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Store = require('../models/Store'); // NEW
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

        // Receptionists don't need a storeId
        const finalStoreId = (role === 'receptionist' || role === 'superadmin') ? null : storeId;

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
        const { period } = req.query;

        const getStartOfDay = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
        const getStartOfWeek = () => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); return d; };
        const getStartOfMonth = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); };

        // We only calculate revenue based on 'expense' transactions (when money enters the store from a user's card)
        const txs = await Transaction.findAll({ where: { type: 'expense' } });
        const stores = await Store.findAll();

        const dailyIncome = txs.filter(t => new Date(t.createdAt) >= getStartOfDay()).reduce((s, t) => s + Number(t.amount), 0);
        const weeklyIncome = txs.filter(t => new Date(t.createdAt) >= getStartOfWeek()).reduce((s, t) => s + Number(t.amount), 0);
        const monthlyIncome = txs.filter(t => new Date(t.createdAt) >= getStartOfMonth()).reduce((s, t) => s + Number(t.amount), 0);

        // Store comparison data
        const storeComparison = stores.map(store => {
            const storeSales = txs.filter(t => t.storeId === store.id);
            return {
                storeName: store.name,
                totalSales: storeSales.reduce((sum, t) => sum + Number(t.amount), 0),
                dailySales: storeSales.filter(t => new Date(t.createdAt) >= getStartOfDay()).reduce((sum, t) => sum + Number(t.amount), 0)
            };
        });

        console.log(storeComparison)

        // ==========================================
        // DYNAMIC CHART DATA GENERATION
        // ==========================================
        let chartData = [];
        const now = new Date();

        if (period === 'daily') {
            for (let i = 0; i <= now.getHours(); i++) {
                const hourSales = txs.filter(t => {
                    const d = new Date(t.createdAt);
                    return d >= getStartOfDay() && d.getHours() === i;
                }).reduce((sum, t) => sum + Number(t.amount), 0);

                chartData.push({ label: `${i}:00`, daromad: hourSales });
            }
        }
        else if (period === 'weekly') {
            const daysOfWeek = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Juma', 'Shan'];
            for (let i = 6; i >= 0; i--) {
                const targetDate = new Date();
                targetDate.setDate(targetDate.getDate() - i);
                targetDate.setHours(0, 0, 0, 0);

                const nextDay = new Date(targetDate);
                nextDay.setDate(nextDay.getDate() + 1);

                const daySales = txs.filter(t => {
                    const d = new Date(t.createdAt);
                    return d >= targetDate && d < nextDay;
                }).reduce((sum, t) => sum + Number(t.amount), 0);

                chartData.push({ label: daysOfWeek[targetDate.getDay()], daromad: daySales });
            }
        }
        else if (period === 'monthly') {
            for (let i = 1; i <= now.getDate(); i++) {
                const targetDate = new Date(now.getFullYear(), now.getMonth(), i);
                const nextDay = new Date(now.getFullYear(), now.getMonth(), i + 1);

                const daySales = txs.filter(t => {
                    const d = new Date(t.createdAt);
                    return d >= targetDate && d < nextDay;
                }).reduce((sum, t) => sum + Number(t.amount), 0);

                chartData.push({ label: `${i}-kun`, daromad: daySales });
            }
        }

        res.json({
            summary: { dailyIncome, weeklyIncome, monthlyIncome },
            storeComparison,
            chartData // Yaratilgan ma'lumotlarni frontga jo'natamiz
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;