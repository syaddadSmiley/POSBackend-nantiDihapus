// file: src/services/UsersService.js
const { BaseRepository } = require('../db');
const _ = require('lodash');
const { LogError } = require('../utils');
const bcryptHash = require('../utils/bcrypt'); 
const jwt = require('jsonwebtoken');

class UsersService {
    
    // --- HELPER WRAPPER ---
    static async getUserByOptions(req, options) {
        return await BaseRepository.getDataByOptions(req, 'users', options);
    }

    // --- 1. LOGIN (Logic yang sudah kita perbaiki) ---
    static async login(req, email, password) {
        try {
            const db = req.app.get('db');
            
            // Gunakan BaseRepository
            const users = await this.getUserByOptions(req, { 
                where: { email: email },
                include: [{ model: db.roles, as: 'role', attributes: ['id', 'name'] }]
            });
            
            if (!users || users.length < 1) throw new Error('Invalid Credentials');

            const user = users[0];
            const isMatch = await bcryptHash.compare(password, user.password);
            
            if (!isMatch) throw new Error('Invalid Credentials');
            
            const config = req.app.get('config'); 
            const jwt_secret = config.auth.jwt_secret; 
            const jwt_expiresin = config.auth.jwt_expiresin;

            const payloadToken = {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role ? user.role.name : 'Unassigned',
                role_id: user.role_id,
            };

            const token = jwt.sign(
                { payloadToken }, 
                jwt_secret, 
                { expiresIn: jwt_expiresin, algorithm: 'HS512' }
            );
            
            return token;

        } catch (err) {
            LogError(__dirname, 'UsersService.login', err.message);
            throw err; 
        }
    }

    // --- 2. GET ALL USERS (Exclude Password) ---
    static async getAllUsers(req) {
        try {
            const db = req.app.get('db');
            const options = {
                attributes: { exclude: ['password'] }, // Jangan kirim hash password ke frontend
                include: [{ model: db.roles, as: 'role', attributes: ['id', 'name'] }],
                order: [['name', 'ASC']]
            };
            
            return await BaseRepository.getDataByOptions(req, 'users', options);
        } catch (error) {
            LogError(__dirname, 'UsersService.getAllUsers', error.message);
            throw error;
        }
    }

    // --- 3. CREATE USER ---
    static async createUser(req, payload) {
        try {
            // Cek Email Unik dulu menggunakan BaseRepository
            const existingUser = await this.getUserByOptions(req, { where: { email: payload.email } });
            if (existingUser && existingUser.length > 0) {
                throw new Error('Email sudah terdaftar');
            }

            // Hash Password
            const hashedPassword = await bcryptHash.hash(payload.password);
            
            // Siapkan Data
            const userData = {
                name: payload.name,
                email: payload.email,
                password: hashedPassword,
                role_id: payload.role_id, // Langsung simpan ID Role
                loggedin: false
            };

            // Panggil BaseRepository.create
            const newUser = await BaseRepository.create(req, userData, 'users');
            
            // Hapus password dari return agar aman
            const result = newUser.toJSON();
            delete result.password;
            
            return result;

        } catch (error) {
            LogError(__dirname, 'UsersService.createUser', error.message);
            throw error;
        }
    }

    // --- 4. UPDATE USER ---
    static async updateUser(req, id, payload) {
        try {
            const updateData = {
                name: payload.name,
                email: payload.email,
                role_id: payload.role_id
            };

            // Hanya update password jika dikirim (tidak kosong)
            if (payload.password && payload.password.trim() !== '') {
                updateData.password = await bcryptHash.hash(payload.password);
            }

            const options = { where: { id: id } };

            // Gunakan BaseRepository.updateOrderByOptions
            // (Nama fungsinya 'Order' tapi generik untuk update by options)
            await BaseRepository.updateOrderByOptions(req, updateData, 'users', options);
            
            return { message: 'User updated successfully' };
        } catch (error) {
            LogError(__dirname, 'UsersService.updateUser', error.message);
            throw error;
        }
    }

    // --- 5. DELETE USER ---
    static async deleteUser(req, id) {
        try {
            // Cegah user menghapus dirinya sendiri
            if (req.decoded && req.decoded.payloadToken.id_user == id) {
                throw new Error('Tidak bisa menghapus akun sendiri yang sedang login');
            }

            const options = { where: { id: id } };
            
            // Gunakan BaseRepository.deleteOrderByOptions
            await BaseRepository.deleteOrderByOptions(req, 'users', options);

            return { message: 'User deleted successfully' };
        } catch (error) {
            LogError(__dirname, 'UsersService.deleteUser', error.message);
            throw error;
        }
    }
}

module.exports = UsersService;