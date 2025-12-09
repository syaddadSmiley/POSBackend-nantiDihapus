// file: src/controllers/ReportController.js
const ReportService = require('../services/ReportService');

class ReportController {
    static async getSales(req, res) {
        try {
            const data = await ReportService.getSalesReport(req);
            res.status(200).json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = ReportController;