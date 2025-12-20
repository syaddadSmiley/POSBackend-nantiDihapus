// file: src/services/UsersService.js
const { BaseRepository } = require('../db');
const _ = require('lodash');
const { LogError } = require('../utils');
const bcryptHash = require('../utils/bcrypt'); 
const jwt = require('jsonwebtoken');

class UsersService {
    
    // --- HELPER ---
    static async getUserByOptions(req, options) {
        return await BaseRepository.getDataByOptions(req, 'users', options);
    }

    // ============================================================
    // BAGIAN 1: USER MANAGEMENT (Login, CRUD User)
    // ============================================================

    static async login(req, email, password) {
        try {
            const db = req.app.get('db');
            const users = await this.getUserByOptions(req, { 
                where: { email: email },
                include: [{ model: db.roles, as: 'role', attributes: ['id', 'name'] }]
            });
            
            if (!users || users.length < 1) throw new Error('Invalid Credentials');
            const user = users[0];
            const isMatch = await bcryptHash.compare(password, user.password);
            if (!isMatch) throw new Error('Invalid Credentials');
            
            const config = req.app.get('config'); 
            const payloadToken = {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role ? user.role.name : 'Unassigned',
                role_id: user.role_id,
            };

            const token = jwt.sign(
                { payloadToken }, 
                config.auth.jwt_secret, 
                { expiresIn: config.auth.jwt_expiresin, algorithm: 'HS512' }
            );
            return token;
        } catch (err) {
            LogError(__dirname, 'UsersService.login', err.message);
            throw err; 
        }
    }

    static async getAllUsers(req) {
        try {
            const db = req.app.get('db');
            return await BaseRepository.getDataByOptions(req, 'users', {
                attributes: { exclude: ['password'] },
                include: [{ model: db.roles, as: 'role', attributes: ['id', 'name'] }],
                order: [['name', 'ASC']]
            });
        } catch (error) {
            LogError(__dirname, 'UsersService.getAllUsers', error.message);
            throw error;
        }
    }

    static async createUser(req, payload) {
        try {
            const existingUser = await this.getUserByOptions(req, { where: { email: payload.email } });
            if (existingUser && existingUser.length > 0) throw new Error('Email sudah terdaftar');

            const newUser = await BaseRepository.create(req, {
                name: payload.name,
                email: payload.email,
                password: payload.password,
                role_id: payload.role_id,
                loggedin: false
            }, 'users');
            
            const result = newUser.toJSON();
            delete result.password;
            return result;
        } catch (error) {
            LogError(__dirname, 'UsersService.createUser', error.message);
            throw error;
        }
    }

    static async updateUser(req, id, payload) {
        try {
            const updateData = { name: payload.name, email: payload.email, role_id: payload.role_id };
            if (payload.password && payload.password.trim() !== '') {
                // HAPUS: updateData.password = await bcryptHash.hash(payload.password);
                updateData.password = payload.password; // Kirim Plain Text
            }
            if (payload.pin && payload.pin.trim() !== '') {
                updateData.pin = payload.pin; // Kirim Plain Text
            }
            await BaseRepository.updateOrderByOptions(req, updateData, 'users', { where: { id: id } });
            return { message: 'User updated successfully' };
        } catch (error) {
            LogError(__dirname, 'UsersService.updateUser', error.message);
            throw error;
        }
    }

    static async deleteUser(req, id) {
        try {
            if (req.decoded && req.decoded.payloadToken.id == id) {
                throw new Error('Tidak bisa menghapus akun sendiri yang sedang login');
            }
            await BaseRepository.deleteOrderByOptions(req, 'users', { where: { id: id } });
            return { message: 'User deleted successfully' };
        } catch (error) {
            LogError(__dirname, 'UsersService.deleteUser', error.message);
            throw error;
        }
    }

    // ============================================================
    // BAGIAN 2: ROLE MANAGEMENT (CRUD Role & Permissions)
    // ============================================================

    // List Role (Diupdate agar include permissions juga)
    static async getAllRoles(req) {
        try {
            const db = req.app.get('db');
            return await BaseRepository.getDataByOptions(req, 'roles', {
                attributes: ['id', 'name'],
                include: [{
                    model: db.permissions,
                    as: 'permissions',
                    attributes: ['id', 'name', 'description'],
                    through: { attributes: [] } 
                }],
                order: [['name', 'ASC']]
            });
        } catch (error) {
            LogError(__dirname, 'UsersService.getAllRoles', error.message);
            throw error;
        }
    }

    static async createRole(req, payload) {
        const db = req.app.get('db');
        const transaction = await db.sequelize.transaction();
        try {
            const { name, permission_ids } = payload;
            const newRole = await db.roles.create({ name }, { transaction });
            
            if (permission_ids && permission_ids.length > 0) {
                await newRole.setPermissions(permission_ids, { transaction });
            }
            await transaction.commit();
            return newRole;
        } catch (error) {
            await transaction.rollback();
            LogError(__dirname, 'UsersService.createRole', error.message);
            throw error;
        }
    }

    static async updateRole(req, id, payload) {
        const db = req.app.get('db');
        const transaction = await db.sequelize.transaction();
        try {
            const { name, permission_ids } = payload;
            const role = await db.roles.findByPk(id, { transaction });
            if (!role) throw new Error('Role not found');

            if (name) await role.update({ name }, { transaction });
            if (permission_ids) await role.setPermissions(permission_ids, { transaction });

            await transaction.commit();
            return { message: 'Role updated successfully' };
        } catch (error) {
            await transaction.rollback();
            LogError(__dirname, 'UsersService.updateRole', error.message);
            throw error;
        }
    }

    static async deleteRole(req, id) {
        try {
            const db = req.app.get('db');
            const role = await db.roles.findByPk(id);
            if (role && role.name.toLowerCase() === 'owner') throw new Error('Cannot delete Owner role');
            
            await BaseRepository.deleteOrderByOptions(req, 'roles', { where: { id } });
            return { message: 'Role deleted successfully' };
        } catch (error) {
            LogError(__dirname, 'UsersService.deleteRole', error.message);
            throw error;
        }
    }

    // ============================================================
    // BAGIAN 3: PERMISSION DICTIONARY
    // ============================================================
    
    static async getAllPermissions(req) {
        try {
            return await BaseRepository.getDataByOptions(req, 'permissions', { order: [['name', 'ASC']] });
        } catch (error) {
            LogError(__dirname, 'UsersService.getAllPermissions', error.message);
            throw error;
        }
    }
}

module.exports = UsersService;