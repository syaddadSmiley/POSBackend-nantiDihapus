const bcrypt = require('bcryptjs');
const saltRounds = 10;

class bcryptHash {
    static async hash(data) {
        const salt = bcrypt.genSaltSync(saltRounds);
        return bcrypt.hashSync(data, salt);
    }

    static async compare(data, hash) {
        return bcrypt.compareSync(data, hash);
    }
}

module.exports = bcryptHash;