const _ = require('lodash');
const UsersService = require('../services/UsersService');
const { LogError } = require('../utils');

class AuthController {

    static async login(req, res, next) {
        try {
            const { payload } = req.body;
            if (_.isUndefined(payload)) {
                res.status(400).json({ message: 'Bad Request' });
                return;
            }
    
            const token = await UsersService.login(req, payload.email, payload.password);
            
            res.status(200).json({ token, expire: 1 });
            return;

        } catch (err) {
            LogError(__dirname, 'AuthController.login', err.message);

            if (err.message === 'Invalid Credentials') {
                res.status(400).json({ message: 'Invalid Credentials' });
            } else {
                res.status(500).json({ message: 'Internal Server Error' });
            }
            return;
        }
    }
}

module.exports = AuthController;