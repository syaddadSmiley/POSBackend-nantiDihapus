// file: src/controllers/ReportController.js
const ReportService = require('../services/ReportService');

class ReportController {
    
    // Endpoint: /api/v1/reports/sales?startDate=...&endDate=...
    static async getSales(req, res) {
        try {
            const data = await ReportService.getSalesReport(req);
            res.status(200).json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Endpoint: /api/v1/dashboard/stats
    static async getDashboardStats(req, res) {
        try {
            // FIX: Panggil method dari ReportService, bukan DashboardService
            const data = await ReportService.getTodayStats(req);
            
            res.status(200).json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = ReportController;