const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// Get all products for the public menu
router.get('/menu', async (req, res) => {
    try {
        const products = await Product.findAll({
            order: [['category', 'ASC'], ['name', 'ASC']]
        });
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
