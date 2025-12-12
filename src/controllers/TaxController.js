// file: src/controllers/TaxController.js
const TaxService = require('../services/TaxService');

class TaxController {
    static async getTaxes(req, res) {
        try {
            const taxes = await TaxService.getAllTaxes(req);
            res.status(200).json(taxes);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = TaxController;