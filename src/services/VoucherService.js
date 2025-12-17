const { BaseRepository } = require('../db');
const { LogError } = require('../utils');
const { Op } = require('sequelize');

class VoucherService {

    static async getAllVouchers(req, params) {
        try {
            const db = req.app.get('db');
            const { search, type, status, page = 1, limit = 10 } = params;

            const where = {};
            
            // Filter by Search (Name or Code)
            if (search) {
                where[Op.or] = [
                    { name: { [Op.like]: `%${search}%` } },
                    { code: { [Op.like]: `%${search}%` } }
                ];
            }

            // Filter by Type
            if (type) where.type = type;

            // Filter by Status (Active/Inactive)
            if (status !== undefined && status !== '') {
                where.is_active = status === 'true';
            }

            const offset = (page - 1) * limit;

            const { count, rows } = await db.discounts.findAndCountAll({
                where,
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['createdAt', 'DESC']]
            });

            return {
                data: rows,
                meta: {
                    totalItems: count,
                    totalPages: Math.ceil(count / limit),
                    currentPage: parseInt(page)
                }
            };

        } catch (err) {
            LogError(__dirname, 'VoucherService.getAllVouchers', err.message);
            throw err;
        }
    }

    static async createVoucher(req, payload) {
        try {
            // Validation: Code must be unique
            if (payload.code) {
                const existing = await BaseRepository.findOneByOptions(req, 'discounts', { where: { code: payload.code } });
                if (existing) throw new Error('Voucher code already exists');
            }
            
            // Uppercase code
            if (payload.code) payload.code = payload.code.toUpperCase();

            return await BaseRepository.create(req, payload, 'discounts');
        } catch (err) {
            LogError(__dirname, 'VoucherService.createVoucher', err.message);
            throw err;
        }
    }

    static async updateVoucher(req, id, payload) {
        try {
            if (payload.code) payload.code = payload.code.toUpperCase();
            
            return await BaseRepository.updateOrderByOptions(req, payload, 'discounts', {
                where: { id }
            });
        } catch (err) {
            LogError(__dirname, 'VoucherService.updateVoucher', err.message);
            throw err;
        }
    }

    static async deleteVoucher(req, id) {
        try {
            return await BaseRepository.deleteOrderByOptions(req, 'discounts', {
                where: { id }
            });
        } catch (err) {
            LogError(__dirname, 'VoucherService.deleteVoucher', err.message);
            throw err;
        }
    }
}

module.exports = VoucherService;