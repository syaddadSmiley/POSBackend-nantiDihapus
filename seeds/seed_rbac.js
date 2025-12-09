// file: seed_rbac.js
const db = require('../src/db/models'); // Sesuaikan path ke models Anda

const permissionsList = [
    // --- USER MANAGEMENT ---
    { name: 'user.view', description: 'Melihat daftar staff' },
    { name: 'user.create', description: 'Menambah staff baru' },
    { name: 'user.edit', description: 'Mengedit data staff' },
    { name: 'user.delete', description: 'Menghapus staff' },
    
    // --- PRODUCT CATALOG ---
    { name: 'product.view', description: 'Melihat produk' },
    { name: 'product.create', description: 'Membuat produk' },
    { name: 'product.edit', description: 'Mengedit produk' },
    { name: 'product.delete', description: 'Menghapus produk' },
    
    // --- INVENTORY ---
    { name: 'inventory.view', description: 'Melihat stok' },
    { name: 'inventory.manage', description: 'Stok masuk/opname' },

    // --- POS / TRANSACTION ---
    { name: 'pos.order', description: 'Melakukan transaksi kasir' },
    { name: 'pos.refund', description: 'Melakukan refund/void' },

    // --- REPORTS ---
    { name: 'report.sales', description: 'Melihat laporan penjualan' },
    { name: 'report.financial', description: 'Melihat laporan keuangan detail' },
];

const seed = async () => {
    try {
        console.log('🔄 Memulai Seeding RBAC...');

        // 1. Create Permissions
        console.log('Bla bla.. Membuat Permissions...');
        for (const perm of permissionsList) {
            await db.permissions.findOrCreate({
                where: { name: perm.name },
                defaults: perm
            });
        }

        // 2. Create Roles
        console.log('👑 Membuat Roles...');
        const [ownerRole] = await db.roles.findOrCreate({ where: { name: 'Owner' } });
        const [cashierRole] = await db.roles.findOrCreate({ where: { name: 'Cashier' } });

        // 3. Assign Permissions to Roles
        console.log('🔗 Menghubungkan Role & Permission...');
        
        // A. OWNER: Dapar SEMUA Permission
        const allPermissions = await db.permissions.findAll();
        await ownerRole.setPermissions(allPermissions);

        // B. CASHIER: Hanya POS dan View Product
        const cashierPermissions = await db.permissions.findAll({
            where: {
                name: ['pos.order', 'product.view', 'inventory.view'] 
            }
        });
        await cashierRole.setPermissions(cashierPermissions);

        // 4. Update Super Admin User
        console.log('👤 Mengupdate Super Admin...');
        // Cari user admin (bisa by ID 1 atau email admin Anda)
        const adminUser = await db.users.findOne({ 
            where: { email: 'admin@pos.com' } // Ganti sesuai email login Anda
        });

        if (adminUser) {
            adminUser.role_id = ownerRole.id;
            await adminUser.save();
            console.log(`✅ User ${adminUser.email} sekarang adalah OWNER.`);
        } else {
            console.log('⚠️ User admin tidak ditemukan, pastikan buat user dulu.');
        }

        console.log('🎉 SEEDING SELESAI! RBAC Siap Digunakan.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Gagal Seeding:', error);
        process.exit(1);
    }
};

seed();