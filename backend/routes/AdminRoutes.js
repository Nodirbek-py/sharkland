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

router.put('/stores/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const store = await Store.findByPk(id);
        if (!store) return res.status(404).json({ message: "Filial topilmadi" });
        
        store.name = name;
        await store.save();
        res.json({ message: "Filial nomi muvaffaqiyatli yangilandi", store });
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

router.put('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, storeId } = req.body;
        
        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ message: "Foydalanuvchi topilmadi" });

        if (username && username !== user.username) {
            const existingUser = await User.findOne({ where: { username } });
            if (existingUser) return res.status(400).json({ message: "Username band!" });
            user.username = username;
        }

        if (password) {
            user.password = await bcrypt.hash(password, 10);
        }

        if (user.role === 'barman' && storeId !== undefined) {
            if (storeId === "" || storeId === null) {
                return res.status(400).json({ message: "Vendor (Filial xodimi) uchun filial tanlanishi majburiy!" });
            }
            user.storeId = storeId;
        }

        await user.save();
        res.json({ message: "Foydalanuvchi muvaffaqiyatli yangilandi", user: { id: user.id, username: user.username, role: user.role, storeId: user.storeId } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ message: "Foydalanuvchi topilmadi" });

        await user.destroy();
        res.json({ message: "Foydalanuvchi muvaffaqiyatli o'chirildi" });
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
        const { period, startDate, endDate, storeId, waiterUsername, waiterStartDate, waiterEndDate } = req.query;

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
        let allOrders = [];

        if (waiterUsername) {
            allOrders = await Order.findAll({ 
                where: { 
                    waiterUsername, 
                    status: { [Op.in]: ['pending', 'paid'] },
                    createdAt: { [Op.between]: [start, end] }
                } 
            });
        } else {
            let txWhere = { type: 'expense', createdAt: { [Op.between]: [start, end] } };
            if (storeId) {
                txWhere.storeId = storeId;
            }
            txs = await Transaction.findAll({ where: txWhere });
            
            // Waiter tahlillari uchun hamma waiter buyurtmalarini olamiz (pending va paid)
            allOrders = await Order.findAll({
                where: {
                    status: { [Op.in]: ['pending', 'paid'] },
                    hasTip: true,
                    createdAt: { [Op.between]: [start, end] }
                }
            });
        }

        const paidOrders = allOrders.filter(o => o.status === 'paid');
        const tipOrders = allOrders.filter(o => o.hasTip);

        const stores = await Store.findAll();

        let totalIncome = 0;
        let totalProfit = 0;
        let totalTip = 0;

        if (waiterUsername) {
            totalIncome = paidOrders.reduce((s, o) => s + Number(o.totalAmount), 0);
            totalProfit = paidOrders.reduce((s, o) => s + (Number(o.totalAmount) - Number(o.netTotalAmount || 0)), 0);
            totalTip = tipOrders.reduce((s, o) => s + Number(o.tipAmount || 0), 0);
        } else {
            totalIncome = txs.reduce((s, t) => s + Number(t.amount), 0);
            totalProfit = txs.reduce((s, t) => s + (Number(t.amount) - Number(t.netAmount || 0)), 0);
            totalTip = txs.reduce((s, t) => s + Number(t.tipAmount || 0), 0) + tipOrders.reduce((s, o) => s + Number(o.tipAmount || 0), 0);
        }

        let storeComparison = [];
        if (!waiterUsername && !storeId) {
            storeComparison = stores.map(store => {
                const storeSales = txs.filter(t => t.storeId === store.id);
                const totalSales = storeSales.reduce((sum, t) => sum + Number(t.amount), 0);
                const totalProfit = storeSales.reduce((sum, t) => sum + (Number(t.amount) - Number(t.netAmount || 0)), 0);
                const dailyTxs = storeSales.filter(t => {
                    const d = new Date(t.createdAt);
                    const today = new Date(); today.setHours(0,0,0,0);
                    return d >= today;
                });
                return {
                    storeName: store.name,
                    totalSales,
                    totalProfit,
                    dailySales: dailyTxs.reduce((sum, t) => sum + Number(t.amount), 0),
                    dailyProfit: dailyTxs.reduce((sum, t) => sum + (Number(t.amount) - Number(t.netAmount || 0)), 0)
                };
            });
        }

        let waiterComparison = [];
        if (!storeId) {
            let targetWaitersOrders = allOrders;

            if (waiterStartDate && waiterEndDate) {
                const wStart = new Date(waiterStartDate);
                wStart.setHours(0, 0, 0, 0);
                const wEnd = new Date(waiterEndDate);
                wEnd.setHours(23, 59, 59, 999);

                targetWaitersOrders = await Order.findAll({
                    where: {
                        status: { [Op.in]: ['pending', 'paid'] },
                        createdAt: { [Op.between]: [wStart, wEnd] }
                    }
                });
            }

            const wPaid = targetWaitersOrders.filter(o => o.status === 'paid');
            const wTip = targetWaitersOrders.filter(o => o.hasTip);

            const waitersList = [...new Set(targetWaitersOrders.map(o => o.waiterUsername))];
            waiterComparison = waitersList.map(w => {
                const wPaidOrders = wPaid.filter(o => o.waiterUsername === w);
                const wTipOrders = wTip.filter(o => o.waiterUsername === w);
                return {
                    waiterUsername: w,
                    totalSales: wPaidOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0),
                    totalTip: wTipOrders.reduce((sum, o) => sum + Number(o.tipAmount || 0), 0),
                };
            });
        }

        let chartData = [];
        let waitersChartData = []; // Tip uchun
        let waitersSalesChartData = []; // Savdo uchun
        
        const getSum = (t_start, t_end) => {
            if (waiterUsername) {
                const filteredPaid = paidOrders.filter(o => {
                    const d = new Date(o.createdAt);
                    return d >= t_start && d < t_end;
                });
                const filteredTip = tipOrders.filter(o => {
                    const d = new Date(o.createdAt);
                    return d >= t_start && d < t_end;
                });
                return {
                    daromad: filteredPaid.reduce((s, o) => s + Number(o.totalAmount), 0),
                    sofDaromad: filteredPaid.reduce((s, o) => s + (Number(o.totalAmount) - Number(o.netTotalAmount || 0)), 0),
                    choychaqa: filteredTip.reduce((s, o) => s + Number(o.tipAmount || 0), 0)
                };
            } else {
                const filteredTxs = txs.filter(t => {
                    const d = new Date(t.createdAt);
                    return d >= t_start && d < t_end;
                });
                const filteredTipOrders = tipOrders.filter(o => {
                    const d = new Date(o.createdAt);
                    return d >= t_start && d < t_end;
                });
                return {
                    daromad: filteredTxs.reduce((s, t) => s + Number(t.amount), 0),
                    sofDaromad: filteredTxs.reduce((s, t) => s + (Number(t.amount) - Number(t.netAmount || 0)), 0),
                    choychaqa: filteredTipOrders.reduce((s, o) => s + Number(o.tipAmount || 0), 0)
                };
            }
        };

        const getWaiterSum = (t_start, t_end, isSales = false) => {
            const targetOrders = isSales ? paidOrders : tipOrders;
            const filteredOrders = targetOrders.filter(o => {
                const d = new Date(o.createdAt);
                return d >= t_start && d < t_end;
            });
            const data = {};
            filteredOrders.forEach(o => {
                if (!data[o.waiterUsername]) data[o.waiterUsername] = 0;
                data[o.waiterUsername] += isSales ? Number(o.totalAmount || 0) : Number(o.tipAmount || 0);
            });
            return data;
        };

        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

        if (diffDays <= 1) {
            for (let i = 0; i <= 23; i++) {
                const t_start = new Date(start); t_start.setHours(i, 0, 0, 0);
                const t_end = new Date(start); t_end.setHours(i + 1, 0, 0, 0);
                chartData.push({ label: `${i}:00`, ...getSum(t_start, t_end) });
                waitersChartData.push({ label: `${i}:00`, ...getWaiterSum(t_start, t_end, false) });
                waitersSalesChartData.push({ label: `${i}:00`, ...getWaiterSum(t_start, t_end, true) });
            }
        } else if (diffDays <= 31) {
            for (let i = 0; i < diffDays; i++) {
                const t_start = new Date(start); t_start.setDate(t_start.getDate() + i); t_start.setHours(0, 0, 0, 0);
                const t_end = new Date(t_start); t_end.setDate(t_end.getDate() + 1);
                chartData.push({ label: `${t_start.getDate()}/${t_start.getMonth()+1}`, ...getSum(t_start, t_end) });
                waitersChartData.push({ label: `${t_start.getDate()}/${t_start.getMonth()+1}`, ...getWaiterSum(t_start, t_end, false) });
                waitersSalesChartData.push({ label: `${t_start.getDate()}/${t_start.getMonth()+1}`, ...getWaiterSum(t_start, t_end, true) });
            }
        } else {
            const startMonth = start.getMonth();
            const endMonth = end.getMonth() + (end.getFullYear() - start.getFullYear()) * 12;
            for (let i = startMonth; i <= endMonth; i++) {
                const t_start = new Date(start.getFullYear(), i, 1);
                const t_end = new Date(start.getFullYear(), i + 1, 1);
                chartData.push({ label: `${t_start.getMonth()+1}/${t_start.getFullYear()}`, ...getSum(t_start, t_end) });
                waitersChartData.push({ label: `${t_start.getMonth()+1}/${t_start.getFullYear()}`, ...getWaiterSum(t_start, t_end, false) });
                waitersSalesChartData.push({ label: `${t_start.getMonth()+1}/${t_start.getFullYear()}`, ...getWaiterSum(t_start, t_end, true) });
            }
        }

        const getStartOfDay = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
        const getStartOfWeek = () => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); return d; };
        const getStartOfMonth = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); };

        let dailyIncome = 0, weeklyIncome = 0, monthlyIncome = 0;
        let dailyProfit = 0, weeklyProfit = 0, monthlyProfit = 0;
        let dailyTip = 0, weeklyTip = 0, monthlyTip = 0;

        if (!waiterUsername && !storeId && (!startDate && !endDate)) {
            const allTxs = await Transaction.findAll({ where: { type: 'expense' } });
            const dailyTxs = allTxs.filter(t => new Date(t.createdAt) >= getStartOfDay());
            const weeklyTxs = allTxs.filter(t => new Date(t.createdAt) >= getStartOfWeek());
            const monthlyTxs = allTxs.filter(t => new Date(t.createdAt) >= getStartOfMonth());

            dailyIncome = dailyTxs.reduce((s, t) => s + Number(t.amount), 0);
            dailyProfit = dailyTxs.reduce((s, t) => s + (Number(t.amount) - Number(t.netAmount || 0)), 0);

            weeklyIncome = weeklyTxs.reduce((s, t) => s + Number(t.amount), 0);
            weeklyProfit = weeklyTxs.reduce((s, t) => s + (Number(t.amount) - Number(t.netAmount || 0)), 0);

            monthlyIncome = monthlyTxs.reduce((s, t) => s + Number(t.amount), 0);
            monthlyProfit = monthlyTxs.reduce((s, t) => s + (Number(t.amount) - Number(t.netAmount || 0)), 0);

            const allTipOrders = await Order.findAll({ where: { status: { [Op.in]: ['pending', 'paid'] }, hasTip: true } });
            const dailyOrders = allTipOrders.filter(t => new Date(t.createdAt) >= getStartOfDay());
            const weeklyOrders = allTipOrders.filter(t => new Date(t.createdAt) >= getStartOfWeek());
            const monthlyOrders = allTipOrders.filter(t => new Date(t.createdAt) >= getStartOfMonth());

            dailyTip = dailyOrders.reduce((s, o) => s + Number(o.tipAmount || 0), 0);
            weeklyTip = weeklyOrders.reduce((s, o) => s + Number(o.tipAmount || 0), 0);
            monthlyTip = monthlyOrders.reduce((s, o) => s + Number(o.tipAmount || 0), 0);
        }

        res.json({
            summary: { 
                dailyIncome: (!waiterUsername && !storeId && !startDate) ? dailyIncome : totalIncome, 
                dailyProfit: (!waiterUsername && !storeId && !startDate) ? dailyProfit : totalProfit, 
                weeklyIncome: (!waiterUsername && !storeId && !startDate) ? weeklyIncome : 0, 
                weeklyProfit: (!waiterUsername && !storeId && !startDate) ? weeklyProfit : 0, 
                monthlyIncome: (!waiterUsername && !storeId && !startDate) ? monthlyIncome : 0,
                monthlyProfit: (!waiterUsername && !storeId && !startDate) ? monthlyProfit : 0,
                totalIncome,
                totalProfit
            },
            tipSummary: {
                dailyTip: (!waiterUsername && !storeId && !startDate) ? dailyTip : 0,
                weeklyTip: (!waiterUsername && !storeId && !startDate) ? weeklyTip : 0,
                monthlyTip: (!waiterUsername && !storeId && !startDate) ? monthlyTip : 0,
                totalTip
            },
            storeComparison,
            waiterComparison,
            chartData,
            waitersChartData,
            waitersSalesChartData
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// MANAGER: Barcha faol (pending) buyurtmalarni olish
router.get('/orders/active', async (req, res) => {
    try {
        const OrderItem = require('../models/OrderItem');
        const orders = await Order.findAll({
            where: { status: 'pending' },
            include: [{ model: OrderItem, as: 'OrderItems' }],
            order: [['createdAt', 'DESC']]
        });
        res.json(orders);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// MANAGER: Barcha bekor qilingan (canceled) buyurtmalarni olish
router.get('/orders/canceled', async (req, res) => {
    try {
        const OrderItem = require('../models/OrderItem');
        const orders = await Order.findAll({
            where: { status: 'canceled' },
            include: [{ model: OrderItem, as: 'OrderItems' }],
            order: [['createdAt', 'DESC']]
        });
        res.json(orders);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// MANAGER: Faol buyurtmani bekor qilish
router.post('/orders/:id/cancel', async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) return res.status(404).json({ message: "Buyurtma topilmadi" });
        if (order.status === 'paid') return res.status(400).json({ message: "To'langan buyurtmani bekor qilib bo'lmaydi" });
        
        order.status = 'canceled';
        await order.save();
        res.json({ success: true, message: "Buyurtma bekor qilindi" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;