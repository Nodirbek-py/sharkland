const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const bcrypt = require('bcrypt'); // Parolni shifrlash uchun
const { Op } = require('sequelize');

// 1. Yangi xodim (User) qo'shish endpointi
router.post('/users', async (req, res) => {
    try {
        const { username, password, role } = req.body;

        // Username bandligini tekshirish
        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) return res.status(400).json({ message: "Bu foydalanuvchi nomi band!" });

        // Parolni xavfsiz shifrlash
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            username,
            password: hashedPassword,
            role
        });

        res.status(201).json({ message: "Foydalanuvchi muvaffaqiyatli qo'shildi!", user: { id: newUser.id, username, role } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/transactions', async (req, res) => {
    try {
        const transactions = await Transaction.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Daromadlar statistikasini kunlik, haftalik, oylik qilib guruhlash
router.get('/analytics', async (req, res) => {
    try {
        const now = new Date();

        // Vaqt chegaralarini belgilash
        const startOfDay = new Date(now.setHours(0, 0, 0, 0));
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const txs = await Transaction.findAll();

        // Davrlarga ko'ra daromadlarni hisoblash (Faqat sotuvlar - 'expense' turi)
        const dailyIncome = txs.filter(t => t.type === 'expense' && new Date(t.createdAt) >= startOfDay).reduce((s, t) => s + Number(t.amount), 0);
        const weeklyIncome = txs.filter(t => t.type === 'expense' && new Date(t.createdAt) >= startOfWeek).reduce((s, t) => s + Number(t.amount), 0);
        const monthlyIncome = txs.filter(t => t.type === 'expense' && new Date(t.createdAt) >= startOfMonth).reduce((s, t) => s + Number(t.amount), 0);

        // Grafik uchun so'nggi 7 kunlik ma'lumotni tayyorlash
        const last7DaysData = Array.from({ length: 7 }).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toLocaleDateString('uz-UZ', { weekday: 'short', day: 'numeric' });

            const daySum = txs
                .filter(t => t.type === 'expense' && new Date(t.createdAt).toDateString() === d.toDateString())
                .reduce((s, t) => s + Number(t.amount), 0);

            return { kun: dateStr, daromad: daySum };
        }).reverse();

        res.json({
            summary: { dailyIncome, weeklyIncome, monthlyIncome },
            chartData: last7DaysData
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;