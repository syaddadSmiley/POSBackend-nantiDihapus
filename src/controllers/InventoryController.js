const InventoryService = require('../services/InventoryService');

class InventoryController {
    
    // Get History (Bisa semua, bisa per item)
    static async history(req, res) {
        try {
            const { variation_id } = req.query;
            const data = await InventoryService.getHistory(req, variation_id);
            res.status(200).json(data);
        } catch (err) { res.status(500).json({ error: err.message }); }
    }

    // Restock / Opname
    static async update(req, res) {
        try {
            const data = await InventoryService.updateStock(req, req.body);
            res.status(200).json(data);
        } catch (err) { res.status(400).json({ error: err.message }); }
    }
}

module.exports = InventoryController;