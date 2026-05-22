const express = require('express');
const router = express.Router();
const Visitor = require('../models/Visitor');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const Order = require('../models/Order');           // Yangi: Order modeli
const OrderItem = require('../models/OrderItem');   // Yangi: OrderItem modeli

// ===================================================================
// 1. OFITSIANT VA VENDOR BUYURTMA TIZIMI (DATABASEGA O'TKAZILDI)
// ===================================================================

// Ofitsiantlar uchun barcha mavjud mahsulotlarni olish (Dinamik Menyu uchun)
router.get('/products/all', async (req, res) => {
    try {
        const products = await Product.findAll({ order: [['name', 'ASC']] });
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Ofitsiant buyurtma yaratishi (BAZAGA SAQLASH + STOL RAQAMI + OMBORDAN AYIRISH)
router.post('/orders/place', async (req, res) => {
    const { items, location, totalAmount, tableNumber, waiterUsername } = req.body;

    try {
        // 1. Asosiy buyurtmani bazada yaratish
        const order = await Order.create({
            tableNumber,
            location,
            totalAmount: Number(totalAmount),
            status: 'pending',
            waiterUsername
        });

        // 2. Buyurtma ichidagi mahsulotlarni (OrderItem) tayyorlash va bazaga yozish
        const orderItemsPayload = items.map(item => ({
            orderId: order.id,
            productId: item.productId,
            name: item.name,
            priceAtPurchase: Number(item.price),
            quantity: Number(item.quantity),
            vendorUsername: item.vendorUsername
        }));

        await OrderItem.bulkCreate(orderItemsPayload);

        // ==========================================================
        // 3. YANGLIK: OMBOR QOLDIG'IDAN (INVENTORY) AYIRIB TASHHLASH
        // ==========================================================
        for (const item of items) {
            const product = await Product.findByPk(item.productId);
            if (product) {
                // Stockdan buyurtma miqdorini ayiramiz (masalan, kg yoki litr bo'lsa ham ishlaydi)
                product.stock = Number(product.stock) - Number(item.quantity);
                await product.save();
            }
        }

        // 4. Socket orqali vendor monitoriga xabar berish uchun obyekt
        const liveOrder = {
            id: order.id,
            tableNumber: order.tableNumber,
            location: order.location,
            totalAmount: order.totalAmount,
            status: 'pending',
            items: orderItemsPayload.map(i => ({
                ...i,
                price: i.priceAtPurchase
            }))

        };

        // Barcha vendorlarga yuboramiz.
        req.io.emit('new_order', liveOrder);
        res.json({
            success: true,
            message: "Buyurtma yuborildi va mahsulotlar ombordan yechildi",
            orderId: order.id
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Kutilayotgan (pending) buyurtmalarni bazadan yuklab olish (Refresh uchun)
router.get('/orders/pending', async (req, res) => {
    try {
        const pendingOrders = await Order.findAll({
            where: { status: 'pending' },
            include: [{
                model: OrderItem,
                as: 'OrderItems'
            }],
            order: [['createdAt', 'DESC']]
        });

        const formattedOrders = pendingOrders.map(order => {
            const plainOrder = order.get({ plain: true });
            return {
                ...plainOrder,
                // Endi bazadan ma'lumot aynan 'OrderItems' nomi bilan keladi
                items: plainOrder.OrderItems || []
            };
        });

        res.json(formattedOrders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Ofitsiant yuborgan buyurtmani yopish (NFC orqali)
router.post('/orders/charge-pending', async (req, res) => {
    const { orderId, nfcCardId } = req.body;

    try {
        // Buyurtmani bazadan qidirish
        const order = await Order.findByPk(orderId);
        if (!order || order.status === 'paid') {
            return res.status(404).json({ message: "Buyurtma topilmadi yoki allaqachon to'langan." });
        }

        const visitor = await Visitor.findOne({ where: { nfcCardId } });
        if (!visitor) return res.status(404).json({ message: "Karta egasi topilmadi." });

        if (Number(visitor.balance) < Number(order.totalAmount)) {
            return res.status(400).json({ message: "Mijoz balansida mablag' yetarli emas!" });
        }

        // Pulni yechish
        visitor.balance = Number(visitor.balance) - Number(order.totalAmount);
        await visitor.save();

        // Buyurtma holatini yangilash
        order.status = 'paid';
        await order.save();

        // Tranzaksiyani saqlash
        await Transaction.create({
            visitorId: visitor.id,
            type: 'expense',
            amount: order.totalAmount,
            location: order.location
        });

        // Ekranni yangilash uchun signal
        req.io.emit('order_paid', { orderId });
        res.json({ success: true, remainingBalance: visitor.balance });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===================================================================
// 2. ON-SPOT QUICK PAYMENT (TEZKOR TO'LOV - INVENTORYSIZ)
// ===================================================================
router.post('/quick-charge', async (req, res) => {
    const { nfcCardId, amount, vendorName } = req.body;

    if (!nfcCardId || !amount || Number(amount) <= 0) {
        return res.status(400).json({ message: "Karta ID va to'g'ri summa kiritilishi shart!" });
    }

    try {
        const visitor = await Visitor.findOne({ where: { nfcCardId } });
        if (!visitor) return res.status(404).json({ message: "Karta egasi topilmadi." });
        if (Number(visitor.balance) < Number(amount)) {
            return res.status(400).json({ message: "Mijoz balansida mablag' yetarli emas!" });
        }

        // Pulni yechish
        visitor.balance = Number(visitor.balance) - Number(amount);
        await visitor.save();

        // Tranzaksiyani qayd etish
        await Transaction.create({
            visitorId: visitor.id,
            type: 'expense',
            amount: amount,
            location: vendorName || 'Tezkor Sotuv Nuqtasi'
        });

        res.json({ success: true, remainingBalance: visitor.balance });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===================================================================
// 3. VENDOR INVENTORY MANAGEMENT (YANGILANDI - MODELGA MOSLAB)
// ===================================================================
router.get('/inventory', async (req, res) => {
    const { vendorUsername } = req.query;

    console.log("Kelgan vendor:", vendorUsername);

    try {
        if (!vendorUsername) {
            return res.status(400).json({ message: "vendorUsername query parametri yuborilmadi!" });
        }

        const products = await Product.findAll({
            where: {
                vendorUsername: vendorUsername
            },
            order: [['createdAt', 'DESC']]
        });
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Yangi maxsulot qo'shish (O'lchov turi va miqdori bilan)
router.post('/inventory', async (req, res) => {
    try {
        const { name, price, stock, unitType, category, vendorUsername } = req.body;

        const product = await Product.create({
            name,
            price: Number(price),
            stock: Number(stock) || 0.00,
            unitType: unitType || 'pcs',
            category: category,
            vendorUsername
        });

        res.status(201).json({ success: true, product });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Maxsulotni tahrirlash
router.put('/inventory/:id', async (req, res) => {
    try {
        const { name, price, stock, unitType, category } = req.body;
        const product = await Product.findByPk(req.params.id);
        if (!product) return res.status(404).json({ message: "Mahsulot topilmadi." });

        product.name = name || product.name;
        product.price = price !== undefined ? Number(price) : product.price;
        product.stock = stock !== undefined ? Number(stock) : product.stock;
        product.unitType = unitType || product.unitType;
        product.category = category || product.category;

        await product.save();
        res.json({ success: true, product });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Maxsulotni o'chirish
router.delete('/inventory/:id', async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);
        if (!product) return res.status(404).json({ message: "Mahsulot topilmadi." });

        await product.destroy();
        res.json({ success: true, message: "Mahsulot o'chirildi." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;