const express = require('express');
const router = express.Router();
const Visitor = require('../models/Visitor');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Store = require('../models/Store');
const fs = require('fs');
const path = require('path');

// ===================================================================
// 1. OFITSIANT VA VENDOR BUYURTMA TIZIMI (DATABASEGA O'TKAZILDI)
// ===================================================================

// Ofitsiantlar uchun barcha mavjud mahsulotlarni olish (Dinamik Menyu uchun)
router.get('/products/all', async (req, res) => {
    try {
        const products = await Product.findAll({ 
            include: [{ model: Store }],
            order: [['name', 'ASC']] 
        });
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/orders/place', async (req, res) => {
    const { items, location, totalAmount, tableNumber, waiterUsername, paidOnSpot } = req.body;

    try {
        // 1. Asosiy bitta buyurtmani yaratish
        const order = await Order.create({
            tableNumber,
            location,
            totalAmount: Number(totalAmount),
            netTotalAmount: 0,
            status: 'pending',
            waiterUsername
        });

        const orderItemsPayload = [];
        let netTotalAmount = 0;

        // 2. Mahsulotlarni tekshirish, ombordan ayirish va qaysi do'konga tegishli ekanligini aniqlash
        for (const item of items) {
            const product = await Product.findByPk(item.productId);
            if (!product) throw new Error(`${item.name} topilmadi!`);

            // Ombordan ayirish
            product.stock = Number(product.stock) - Number(item.quantity);
            await product.save();

            const itemNetPrice = product.netPrice !== null && product.netPrice !== undefined ? Number(product.netPrice) : Number(product.price);
            netTotalAmount += itemNetPrice * Number(item.quantity);

            orderItemsPayload.push({
                orderId: order.id,
                productId: item.productId,
                name: item.name,
                priceAtPurchase: Number(item.price),
                netPriceAtPurchase: itemNetPrice,
                quantity: Number(item.quantity),
                storeId: product.storeId,
                isPaid: paidOnSpot ? true : false
            });
        }

        order.netTotalAmount = netTotalAmount;
        await order.save();

        // Barcha itemlarni bazaga saqlash
        await OrderItem.bulkCreate(orderItemsPayload);

        // 3. Socket orqali xabar yuborish
        req.io.emit('new_order', {
            id: order.id,
            tableNumber: order.tableNumber,
            location: order.location,
            totalAmount: order.totalAmount,
            status: 'pending',
            items: orderItemsPayload
        });

        res.json({ success: true, message: "Buyurtma yuborildi", orderId: order.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Kutilayotgan (pending) buyurtmalarni bazadan yuklab olish (Refresh uchun)
router.get('/orders/pending', async (req, res) => {
    const { storeId } = req.query;

    try {
        let itemFilter = { isPrepared: false };
        if (storeId) {
            itemFilter.storeId = storeId;
        }

        const pendingOrders = await Order.findAll({
            where: { status: 'pending' },
            include: [{
                model: OrderItem,
                as: 'OrderItems', 
                where: itemFilter, 
                required: true 
            }],
            order: [['createdAt', 'DESC']]
        });

        res.json(pendingOrders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Ofitsiant yuborgan buyurtmani yopish (NFC orqali)
router.post('/orders/charge-pending', async (req, res) => {
    // Endi frontenddan kelyotgan storeId dan foydalanamiz
    const { orderId, nfcCardId, storeId } = req.body;

    try {
        const order = await Order.findByPk(orderId);
        if (!order) {
            return res.status(404).json({ message: "Buyurtma topilmadi." });
        }

        const visitor = await Visitor.findOne({ where: { nfcCardId } });
        if (!visitor) return res.status(404).json({ message: "Karta egasi topilmadi." });

        // 1. Faqat shu filialga tegishli va HALI TO'LANMAGAN mahsulotlarni olamiz
        const items = await OrderItem.findAll({
            where: { orderId: order.id, storeId: storeId, isPaid: false }
        });

        if (items.length === 0) {
            return res.status(400).json({ message: "Bu filial uchun to'lanmagan mahsulotlar qolmagan." });
        }

        // 2. Faqat shu filialning summasini hisoblaymiz (priceAtPurchase orqali)
        let storeTotal = 0;
        let storeNetTotal = 0;
        items.forEach(item => {
            storeTotal += Number(item.priceAtPurchase || 0) * Number(item.quantity || 0);
            storeNetTotal += Number(item.netPriceAtPurchase || item.priceAtPurchase || 0) * Number(item.quantity || 0);
        });

        if (Number(visitor.balance) < storeTotal) {
            return res.status(400).json({ message: "Mijoz balansida mablag' yetarli emas!" });
        }

        // 3. Mijozdan faqat filialning pulini yechish
        visitor.balance = Number(visitor.balance) - storeTotal;
        await visitor.save();

        // 4. Shu mahsulotlarni to'langan va tayyor deb belgilash
        for (let item of items) {
            item.isPaid = true;
            item.isPrepared = true;
            await item.save();
        }

        // 5. Tranzaksiya yozish (Faqat shu filial uchun)
        await Transaction.create({
            visitorId: visitor.id,
            type: 'expense',
            amount: storeTotal,
            netAmount: storeNetTotal,
            location: order.location,
            storeId: storeId
        });

        // 6. Agar butun orderdagi HAMMA narsa tayyor bo'lsa, asosiy orderni ham yopamiz
        const remainingUnprepared = await OrderItem.count({ where: { orderId: order.id, isPrepared: false } });
        if (remainingUnprepared === 0) {
            order.status = 'paid';
            await order.save();
        }

        // 7. DIQQAT: Yangi event! Buni hamma o'chirmasligi uchun storeId ni ham qo'shib jo'natamiz
        req.io.emit('store_order_paid', { orderId, paidStoreId: storeId });

        res.json({ success: true, remainingBalance: visitor.balance });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// To'langan buyurtmani "Tayyor" deb belgilash
router.post('/orders/mark-done', async (req, res) => {
    const { orderId, storeId } = req.body;
    try {
        const order = await Order.findByPk(orderId);
        if (!order) return res.status(404).json({ message: "Buyurtma topilmadi." });

        const items = await OrderItem.findAll({ where: { orderId: order.id, storeId: storeId } });
        for (let item of items) {
            item.isPrepared = true;
            await item.save();
        }

        const remainingUnprepared = await OrderItem.count({ where: { orderId: order.id, isPrepared: false } });
        if (remainingUnprepared === 0) {
            order.status = 'paid';
            await order.save();
        }

        req.io.emit('store_order_paid', { orderId, paidStoreId: storeId });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===================================================================
// 2. ON-SPOT QUICK PAYMENT (TEZKOR TO'LOV - INVENTORYSIZ)
// ===================================================================
router.post('/quick-charge', async (req, res) => {
    const { nfcCardId, amount, vendorName, storeId } = req.body;

    if (!nfcCardId || !amount || Number(amount) <= 0) {
        return res.status(400).json({ message: "Karta ID va to'g'ri summa kiritilishi shart!" });
    }

    try {
        const visitor = await Visitor.findOne({ where: { nfcCardId } });
        if (!visitor) return res.status(404).json({ message: "Karta egasi topilmadi." });
        if (Number(visitor.balance) < Number(amount)) {
            return res.status(400).json({ message: "Mijoz balansida mablag' yetarli emas!" });
        }

        visitor.balance = Number(visitor.balance) - Number(amount);
        await visitor.save();

        await Transaction.create({
            visitorId: visitor.id,
            type: 'expense',
            amount: amount,
            netAmount: 0,
            location: vendorName || 'Tezkor Sotuv Nuqtasi',
            storeId: storeId // <-- NEW: Link revenue to the branch
        });

        res.json({ success: true, remainingBalance: visitor.balance });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===================================================================
// 2.5 VENDOR DIRECT SALE (KASSA - INVENTORY BILAN)
// ===================================================================
router.post('/direct-sale', async (req, res) => {
    const { nfcCardId, items, vendorName, storeId } = req.body;

    if (!nfcCardId || !items || items.length === 0) {
        return res.status(400).json({ message: "Karta ID va mahsulotlar kiritilishi shart!" });
    }

    try {
        const visitor = await Visitor.findOne({ where: { nfcCardId } });
        if (!visitor) return res.status(404).json({ message: "Karta egasi topilmadi." });

        let totalAmount = 0;
        let netTotalAmount = 0;

        // 1. Hisob-kitob qilish va mahsulotlarni tekshirish
        for (const item of items) {
            const product = await Product.findByPk(item.productId);
            if (!product) throw new Error(`${item.name} topilmadi!`);
            if (Number(product.stock) < Number(item.quantity)) {
                throw new Error(`${item.name} omborda yetarli emas!`);
            }
            totalAmount += Number(item.price) * Number(item.quantity);
        }

        if (Number(visitor.balance) < totalAmount) {
            return res.status(400).json({ message: "Mijoz balansida mablag' yetarli emas!" });
        }

        // 2. Pulni yechish
        visitor.balance = Number(visitor.balance) - totalAmount;
        await visitor.save();

        // 3. Order yaratish
        const order = await Order.create({
            tableNumber: 'Kassa',
            location: vendorName || 'Kassa',
            totalAmount: totalAmount,
            netTotalAmount: 0, // Keyin yangilanadi
            status: 'paid',
            waiterUsername: vendorName || 'Vendor'
        });

        const orderItemsPayload = [];

        // 4. Mahsulotlarni ayirish va OrderItem larni yaratish
        for (const item of items) {
            const product = await Product.findByPk(item.productId);
            
            // Ombordan ayirish
            product.stock = Number(product.stock) - Number(item.quantity);
            await product.save();

            const itemNetPrice = product.netPrice !== null && product.netPrice !== undefined ? Number(product.netPrice) : Number(product.price);
            netTotalAmount += itemNetPrice * Number(item.quantity);

            orderItemsPayload.push({
                orderId: order.id,
                productId: item.productId,
                name: item.name,
                priceAtPurchase: Number(item.price),
                netPriceAtPurchase: itemNetPrice,
                quantity: Number(item.quantity),
                storeId: storeId,
                isPaid: true,
                isPrepared: true
            });
        }

        order.netTotalAmount = netTotalAmount;
        await order.save();

        await OrderItem.bulkCreate(orderItemsPayload);

        // 5. Tranzaksiya yozish
        await Transaction.create({
            visitorId: visitor.id,
            type: 'expense',
            amount: totalAmount,
            netAmount: netTotalAmount,
            location: vendorName || 'Kassa',
            storeId: storeId
        });

        // 6. Asosiy darchalarga event yuborish (shart emas chunki "paid" statusida bo'ladi)
        // req.io.emit('store_order_paid', { orderId: order.id, paidStoreId: storeId });

        res.json({ success: true, remainingBalance: visitor.balance, orderId: order.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===================================================================
// 3. VENDOR INVENTORY MANAGEMENT (YANGILANDI - MODELGA MOSLAB)
// ===================================================================
router.get('/inventory', async (req, res) => {
    const { storeId } = req.query;

    console.log("Kelgan storeId:", storeId);

    try {
        if (!storeId) {
            return res.status(400).json({ message: "storeId query parametri yuborilmadi!" });
        }

        const products = await Product.findAll({
            where: {
                storeId: storeId
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
        const { name, price, netPrice, stock, unitType, category, storeId } = req.body;

        const product = await Product.create({
            name,
            price: Number(price),
            netPrice: netPrice !== undefined && netPrice !== '' ? Number(netPrice) : Number(price),
            stock: Number(stock) || 0.00,
            unitType: unitType || 'pcs',
            category: category,
            storeId: storeId
        });

        res.status(201).json({ success: true, product });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Maxsulotni tahrirlash
router.put('/inventory/:id', async (req, res) => {
    try {
        const { name, price, netPrice, stock, unitType, category } = req.body;
        const product = await Product.findByPk(req.params.id);
        if (!product) return res.status(404).json({ message: "Mahsulot topilmadi." });

        product.name = name || product.name;
        product.price = price !== undefined ? Number(price) : product.price;
        if (netPrice !== undefined && netPrice !== '') product.netPrice = Number(netPrice);
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