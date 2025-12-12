// src/services/DiscountService.js
const { discounts, order_discounts, orders, sequelize } = require('../db/models');
const { Op } = require('sequelize');

class DiscountService {
  /**
   * Memvalidasi apakah sebuah kode diskon valid untuk digunakan.
   * @param {string} code - Kode voucher yang diinput user.
   * @param {number} subtotal - Subtotal belanja saat ini.
   * @param {number} userId - ID user/member (opsional).
   * @returns {Object} Objek diskon yang valid.
   */
  async validateDiscount(code, subtotal, userId = null) {
    const discount = await discounts.findOne({ where: { code: code, is_active: true } });

    if (!discount) throw new Error('Kode diskon tidak valid.');
    if (new Date() < discount.start_date || new Date() > discount.end_date) throw new Error('Diskon tidak berlaku pada periode ini.');
    if (subtotal < discount.min_order_amount) throw new Error(`Minimum belanja untuk diskon ini adalah Rp ${discount.min_order_amount}`);
    if (discount.usage_limit_total > 0 && discount.current_usage >= discount.usage_limit_total) throw new Error('Kuota diskon ini sudah habis.');

    // Validasi kuota per user jika ada
    if (userId && discount.usage_limit_per_user > 0) {
      const userUsage = await order_discounts.count({ where: { discount_id: discount.id, '$order.user_id$': userId }, include: 'order' });
      if (userUsage >= discount.usage_limit_per_user) throw new Error('Anda sudah mencapai batas penggunaan diskon ini.');
    }
    
    return discount;
  }

  /**
   * Menghitung jumlah potongan berdasarkan aturan diskon.
   * @param {Object} discount - Objek diskon dari DB.
   * @param {number} subtotal - Subtotal belanja.
   * @returns {number} Jumlah potongan dalam Rupiah.
   */
  calculateDiscountAmount(discount, subtotal) {
    let amount = 0;
    if (discount.type === 'FIXED') {
      amount = discount.value;
    } else if (discount.type === 'PERCENTAGE') {
      amount = Math.floor((subtotal * discount.value) / 100);
      if (discount.max_discount_amount > 0) {
        amount = Math.min(amount, discount.max_discount_amount);
      }
    }
    return Math.min(amount, subtotal);
  }

  /**
   * Menerapkan diskon ke order dalam sebuah transaksi database.
   */
  async applyDiscountToOrder(transaction, { orderId, discountRule, calculatedAmount }) {
    await order_discounts.create({
      order_id: orderId,
      discount_id: discountRule.id,
      name: discountRule.name,
      amount: calculatedAmount,
    }, { transaction });

    await discounts.increment('current_usage', { by: 1, where: { id: discountRule.id }, transaction });
  }
}

module.exports = new DiscountService();
