// file: src/controllers/ShiftController.js

const ShiftService = require('../services/ShiftService');
const { LogError } = require('../utils');

class ShiftController {

    static async checkStatus(req, res) {
        try {
            const userId = req.decoded.payloadToken.id;
            console.log('Checking shift status for user ID:', userId);

            const currentShift = await ShiftService.getCurrentShift(req, userId);

            if (currentShift) {
                return res.status(200).json({
                    status: 'open',
                    shift: currentShift
                });
            } else {
                return res.status(200).json({
                    status: 'closed',
                    shift: null
                });
            }
        } catch (error) {
            LogError(__dirname, 'ShiftController.checkStatus', error.message);
            res.status(500).json({ message: error.message });
        }
    }

    static async open(req, res) {
        try {
            const userId = req.decoded.payloadToken.id;
            const { start_cash } = req.body; // Input dari Android

            if (start_cash === undefined || start_cash < 0) {
                return res.status(400).json({ message: 'start_cash diperlukan' });
            }

            const shift = await ShiftService.openShift(req, userId, start_cash);
            res.json(shift);
        } catch (error) {
            LogError(__dirname, 'ShiftController.open', error.message);
            res.status(400).json({ message: error.message });
        }
    }

    static async close(req, res) {
        try {
            const userId = req.decoded.payloadToken.id;
            const { end_cash } = req.body; // Input dari Android

            if (end_cash === undefined || end_cash < 0) {
                return res.status(400).json({ message: 'end_cash diperlukan' });
            }

            const result = await ShiftService.closeShift(req, userId, end_cash);
            res.json(result);
        } catch (error) {
            LogError(__dirname, 'ShiftController.close', error.message);
            res.status(400).json({ message: error.message });
        }
    }
}

module.exports = ShiftController;