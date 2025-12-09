const jwt = require('jsonwebtoken');
const _ = require('lodash');
const { LogError } = require('../utils'); // Pastikan path ini benar ke index utils Anda

module.exports = {

    // --- 1. AUTHENTICATION (Cek Siapa Anda) ---
    async verifyToken(req, res, next) {
        try {
            let token = null;

            // 1. Cek Header Authorization (Prioritas Utama)
            if (req.headers.authorization) {
                const parts = req.headers.authorization.split(' ');
                if (parts.length === 2 && parts[0] === 'Bearer') {
                    token = parts[1];
                }
            }
            
            // 2. Cek Query Param (Fallback)
            if (!token && req.query.token) {
                token = req.query.token;
            }

            // 3. Cek Header x-access-token (Fallback Legacy)
            if (!token && req.headers['x-access-token']) {
                token = req.headers['x-access-token'];
            }

            if (!token) {
                return res.status(401).json({ error: 'Unauthorized: Token is missing' });
            }

            // 4. Verifikasi JWT
            const config = req.app.get('config'); 
            const jwt_secret = config.auth.jwt_secret; 

            jwt.verify(token, jwt_secret, (err, decoded) => {
                if (err) {
                    return res.status(401).json({ error: 'Unauthorized: Token expired or invalid' });
                }
                
                // Simpan data user di request agar bisa dipakai di controller/middleware lain
                req.decoded = decoded; 
                next();
            });

        } catch (err) {
            LogError(__dirname, 'middleware.verifyToken', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    },

    // --- 2. AUTHORIZATION (Cek Hak Akses) ---
    // Contoh penggunaan di router: mw.can('product.create')
    can(requiredPermission) {
        return async (req, res, next) => {
            try {
                // Pastikan user sudah login (verifyToken harus jalan duluan)
                if (!req.decoded || !req.decoded.payloadToken) {
                    return res.status(401).json({ message: 'Unauthorized: No user session' });
                }

                const db = req.app.get('db');
                const userId = req.decoded.payloadToken.id; // Pastikan key ini sesuai payload login

                // Query User + Role + Permissions
                // Kita ambil permissions yang dimiliki Role user ini
                const user = await db.users.findByPk(userId, {
                    include: [{
                        model: db.roles,
                        as: 'role', // Sesuai alias di model Users
                        include: [{
                            model: db.permissions,
                            as: 'permissions' // Sesuai alias di model Roles
                        }]
                    }]
                });

                // Cek Validitas User & Role
                if (!user) {
                    return res.status(401).json({ message: 'User not found' });
                }
                if (!user.role) {
                    return res.status(403).json({ message: 'Forbidden: User has no role assigned' });
                }

                // Cek Kepemilikan Permission
                // .some() akan return true jika salah satu permission namanya cocok
                const hasPermission = user.role.permissions.some(p => p.name === requiredPermission);

                // KHUSUS: Jika Role namanya 'Owner', kita beri akses "Dewa" (Bypass)
                // Ini opsional, tapi berguna agar Owner tidak perlu assign permission manual ke diri sendiri
                const isOwner = user.role.name.toLowerCase() === 'owner';

                if (hasPermission || isOwner) {
                    next(); // Lolos!
                } else {
                    return res.status(403).json({ 
                        message: `Forbidden: You need permission '${requiredPermission}' to access this resource.` 
                    });
                }

            } catch (error) {
                LogError(__dirname, `middleware.can(${requiredPermission})`, error);
                return res.status(500).json({ message: 'Error checking permissions' });
            }
        };
    },

    // --- UTILS LAIN (Legacy/Testing) ---
    async testAccess(req, res, next){
        try{
            if (req.body.ambatukam == true){
                next()
            }else{
                res.json('error')
            }
        } catch (err){
            console.log('error', err)
        }
    },
};