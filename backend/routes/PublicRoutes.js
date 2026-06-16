const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Store = require('../models/Store');

// Get all products for the public menu
router.get('/menu', async (req, res) => {
    try {
        const products = await Product.findAll({
            include: [{ model: Store, attributes: ['id', 'name'] }],
            order: [
              [Store, 'name', 'ASC'], 
              ['name', 'ASC']
            ]
        });
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
