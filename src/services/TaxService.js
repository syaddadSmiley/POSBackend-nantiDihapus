// file: src/services/TaxService.js
const { LogError } = require('../utils'); // Sesuaikan path utils

class TaxService {
    static async getAllTaxes(req) {
        const db = req.app.get('db');
        try {
            // Ambil semua data pajak yang aktif
            return await db.taxes.findAll({
                attributes: ['id', 'name', 'rate', 'type'], // Ambil field penting
                order: [['name', 'ASC']]
            });
        } catch (error) {
            LogError(__dirname, 'TaxService.getAllTaxes', error);
            throw error;
        }
    }
}

module.exports = TaxService;