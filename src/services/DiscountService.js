const { BaseRepository } = require('../db');
const { LogError } = require('../utils');
const { Op } = require('sequelize');
const _ = require('lodash');

class DiscountService {

    /**
     * Validate if a voucher code is applicable
     */
    static async validateDiscount(req, code, subtotal, userId = null) {
        try {
            const db = req.app.get('db');
            const now = new Date();

            // 1. Cari Voucher
            const discount = await db.discounts.findOne({
                where: {
                    code: code,
                    is_active: true,
                    start_date: { [Op.lte]: now }, // Mulai sebelum sekarang
                    end_date: { [Op.gte]: now }    // Berakhir setelah sekarang
                }
            });

            if (!discount) {
                throw new Error(`Kode voucher '${code}' tidak ditemukan atau kadaluarsa.`);
            }

            // 2. Cek Kuota Global
            if (discount.usage_limit_total > 0 && discount.current_usage >= discount.usage_limit_total) {
                throw new Error(`Voucher '${code}' usage limit reached.`);
            }

            // 3. Cek Minimum Belanja
            if (subtotal < discount.min_order_amount) {
                throw new Error(`Minimum spend for '${code}' is Rp ${discount.min_order_amount.toLocaleString('id-ID')}`);
            }

            // 4. Cek Kuota Per User (Optional - Jika sistem member aktif)
            if (userId && discount.usage_limit_per_user > 0) {
                // Hitung berapa kali user ini sudah pakai voucher ini di tabel order_discounts join orders
                // Logic ini bisa ditambahkan nanti jika fitur member sudah matang
            }

            return discount;

        } catch (error) {
            LogError(__dirname, 'DiscountService.validateDiscount', error.message);
            throw error;
        }
    }

    /**
     * Calculate discount amount based on type
     */
    static calculateAmount(discount, baseAmount) {
        let cutAmount = 0;

        if (discount.type === 'FIXED') {
            cutAmount = discount.value;
        } else if (discount.type === 'PERCENTAGE') {
            cutAmount = Math.round(baseAmount * (discount.value / 100));
            
            // Cek Max Discount Cap
            if (discount.max_discount_amount > 0 && cutAmount > discount.max_discount_amount) {
                cutAmount = discount.max_discount_amount;
            }
        }

        // Diskon tidak boleh melebihi harga barang (Safety)
        return Math.min(cutAmount, baseAmount);
    }

    /**
     * Increment usage counter
     */
    static async incrementUsage(req, discountId, transaction) {
        try {
            const db = req.app.get('db');
            await db.discounts.increment('current_usage', { 
                by: 1, 
                where: { id: discountId },
                transaction 
            });
        } catch (error) {
            LogError(__dirname, 'DiscountService.incrementUsage', error.message);
            throw error;
        }
    }
}

module.exports = DiscountService;