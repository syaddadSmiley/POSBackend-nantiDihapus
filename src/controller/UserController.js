// file: src/controllers/UserController.js
const UsersService = require('../services/UsersService');
const _ = require('lodash');
const { LogError } = require('../utils');

class UserController {

    // --- AUTH & USER ---
    static async login(req, res) {
        try {
            const { payload } = req.body;
            if (_.isUndefined(payload)) return res.status(400).json({ message: 'Bad Request' });
            const token = await UsersService.login(req, payload.email, payload.password);
            res.status(200).json({ token, expire: 1 });
        } catch (err) {
            LogError(__dirname, 'UserController.login', err.message);
            if (err.message === 'Invalid Credentials') return res.status(400).json({ message: 'Invalid Credentials' });
            res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    static async list(req, res) {
        try {
            const data = await UsersService.getAllUsers(req);
            res.json(data);
        } catch (error) { res.status(500).json({ error: error.message }); }
    }

    static async create(req, res) {
        try {
            const data = await UsersService.createUser(req, req.body);
            res.status(201).json(data);
        } catch (error) {
            const status = error.message === 'Email sudah terdaftar' ? 400 : 500;
            res.status(status).json({ error: error.message });
        }
    }

    static async update(req, res) {
        try {
            const data = await UsersService.updateUser(req, req.params.id, req.body);
            res.json(data);
        } catch (error) { res.status(400).json({ error: error.message }); }
    }

    static async remove(req, res) {
        try {
            const data = await UsersService.deleteUser(req, req.params.id);
            res.json(data);
        } catch (error) {
            const status = error.message.includes('Tidak bisa') ? 403 : 400;
            res.status(status).json({ error: error.message });
        }
    }

    // --- ROLES ---
    static async roleList(req, res) {
        try {
            const roles = await UsersService.getAllRoles(req);
            res.status(200).json(roles);
        } catch (err) { res.status(500).json({ error: err.message }); }
    }

    static async roleCreate(req, res) {
        try {
            const data = await UsersService.createRole(req, req.body);
            res.status(201).json(data);
        } catch (err) { res.status(400).json({ error: err.message }); }
    }

    static async roleUpdate(req, res) {
        try {
            const data = await UsersService.updateRole(req, req.params.id, req.body);
            res.status(200).json(data);
        } catch (err) { res.status(400).json({ error: err.message }); }
    }

    static async roleRemove(req, res) {
        try {
            const data = await UsersService.deleteRole(req, req.params.id);
            res.status(200).json(data);
        } catch (err) { res.status(400).json({ error: err.message }); }
    }

    // --- PERMISSIONS ---
    static async permissionList(req, res) {
        try {
            const data = await UsersService.getAllPermissions(req);
            res.status(200).json(data);
        } catch (error) { res.status(500).json({ message: error.message }); }
    }
}

module.exports = UserController;