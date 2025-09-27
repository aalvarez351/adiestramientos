require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

async function checkRealData() {
    try {
        await client.connect();
        console.log('✅ Conectado a MongoDB');
        
        const db = client.db('test');
        
        // Verificar colecciones existentes
        const collections = await db.listCollections().toArray();
        console.log('\n📊 Colecciones disponibles:');
        collections.forEach(col => console.log(`- ${col.name}`));
        
        // Contar documentos en cada colección
        console.log('\n📈 Conteo de documentos:');
        for (const col of collections) {
            const count = await db.collection(col.name).countDocuments();
            console.log(`${col.name}: ${count} documentos`);
        }
        
        // Verificar estructura de datos reales
        console.log('\n🔍 Estructura de datos:');
        
        // Clientes
        const sampleClient = await db.collection('clientes').findOne();
        if (sampleClient) {
            console.log('\nEstructura de Cliente:');
            console.log(Object.keys(sampleClient));
        }
        
        // Préstamos
        const sampleLoan = await db.collection('prestamos').findOne();
        if (sampleLoan) {
            console.log('\nEstructura de Préstamo:');
            console.log(Object.keys(sampleLoan));
        }
        
        // Pagos
        const samplePayment = await db.collection('pagos').findOne();
        if (samplePayment) {
            console.log('\nEstructura de Pago:');
            console.log(Object.keys(samplePayment));
        }
        
        // Estadísticas reales para el dashboard
        console.log('\n📊 ESTADÍSTICAS REALES PARA DASHBOARD:');
        
        // Total de préstamos por estado
        const loansByStatus = await db.collection('prestamos').aggregate([
            {
                $group: {
                    _id: '$estado',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$capital_inicial' }
                }
            }
        ]).toArray();
        
        console.log('\nPréstamos por estado:');
        loansByStatus.forEach(stat => {
            console.log(`${stat._id}: ${stat.count} préstamos, $${stat.totalAmount?.toLocaleString() || 0}`);
        });
        
        // Total de pagos por tipo
        const paymentsByType = await db.collection('pagos').aggregate([
            {
                $group: {
                    _id: '$tipo',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$monto' }
                }
            }
        ]).toArray();
        
        console.log('\nPagos por tipo:');
        paymentsByType.forEach(stat => {
            console.log(`${stat._id}: ${stat.count} pagos, $${stat.totalAmount?.toLocaleString() || 0}`);
        });
        
        // KPIs principales
        const totalLoans = await db.collection('prestamos').aggregate([
            {
                $group: {
                    _id: null,
                    totalCapital: { $sum: '$capital_inicial' },
                    totalSaldo: { $sum: '$saldo_actual' },
                    count: { $sum: 1 }
                }
            }
        ]).toArray();
        
        const totalPayments = await db.collection('pagos').aggregate([
            {
                $group: {
                    _id: null,
                    totalPaid: { $sum: '$monto' }
                }
            }
        ]).toArray();
        
        console.log('\n💰 KPIs PRINCIPALES:');
        if (totalLoans[0]) {
            console.log(`Total Cartera: $${totalLoans[0].totalCapital?.toLocaleString() || 0}`);
            console.log(`Saldo Actual: $${totalLoans[0].totalSaldo?.toLocaleString() || 0}`);
            console.log(`Préstamos Activos: ${totalLoans[0].count}`);
        }
        
        if (totalPayments[0]) {
            console.log(`Total Pagado: $${totalPayments[0].totalPaid?.toLocaleString() || 0}`);
        }
        
        // Préstamos recientes
        const recentLoans = await db.collection('prestamos').aggregate([
            {
                $lookup: {
                    from: 'clientes',
                    localField: 'cliente_id',
                    foreignField: '_id',
                    as: 'cliente'
                }
            },
            {
                $addFields: {
                    cliente: { $arrayElemAt: ['$cliente', 0] }
                }
            },
            { $sort: { fecha_creacion: -1 } },
            { $limit: 5 }
        ]).toArray();
        
        console.log('\n📋 PRÉSTAMOS RECIENTES:');
        recentLoans.forEach(loan => {
            const clientName = loan.cliente ? `${loan.cliente.nombre} ${loan.cliente.apellido}` : 'Cliente no encontrado';
            console.log(`${clientName}: $${loan.capital_inicial?.toLocaleString()} - ${loan.estado}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.close();
    }
}

checkRealData();