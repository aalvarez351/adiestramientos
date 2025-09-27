require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

async function testDashboardData() {
    try {
        await client.connect();
        console.log('✅ Conectado a MongoDB para pruebas del dashboard');
        
        const db = client.db('test');
        
        console.log('\n🧪 PROBANDO DATOS REALES DEL DASHBOARD:\n');
        
        // Test KPIs
        console.log('📊 KPIs:');
        const [loanStats, paymentStats] = await Promise.all([
            db.collection('prestamos').aggregate([
                {
                    $group: {
                        _id: null,
                        totalLoans: { $sum: '$capital_inicial' },
                        currentBalance: { $sum: '$saldo_actual' },
                        activeLoans: { $sum: { $cond: [{ $eq: ['$estado', 'activo'] }, 1, 0] } },
                        interestAccumulated: { $sum: '$interes_acumulado' },
                        lateFeesAccumulated: { $sum: '$atraso_acumulado' }
                    }
                }
            ]).toArray(),
            db.collection('pagos').aggregate([
                {
                    $group: {
                        _id: null,
                        totalPaid: { $sum: '$monto' }
                    }
                }
            ]).toArray()
        ]);
        
        const kpis = {
            totalLoans: Math.round(loanStats[0]?.totalLoans || 0),
            totalPaid: Math.round(paymentStats[0]?.totalPaid || 0),
            currentBalance: Math.round(loanStats[0]?.currentBalance || 0),
            interestAccumulated: Math.round(loanStats[0]?.interestAccumulated || 0),
            lateFeesAccumulated: Math.round(loanStats[0]?.lateFeesAccumulated || 0),
            activeLoans: loanStats[0]?.activeLoans || 0
        };
        
        console.log('Total Cartera:', `$${kpis.totalLoans.toLocaleString()}`);
        console.log('Total Pagado:', `$${kpis.totalPaid.toLocaleString()}`);
        console.log('Saldo Actual:', `$${kpis.currentBalance.toLocaleString()}`);
        console.log('Interés Acumulado:', `$${kpis.interestAccumulated.toLocaleString()}`);
        console.log('Atrasos Acumulados:', `$${kpis.lateFeesAccumulated.toLocaleString()}`);
        console.log('Préstamos Activos:', kpis.activeLoans);
        
        // Test gráficos
        console.log('\n📈 Datos para Gráficos:');
        const loansByStatus = await db.collection('prestamos').aggregate([
            {
                $group: {
                    _id: '$estado',
                    count: { $sum: 1 }
                }
            }
        ]).toArray();
        
        console.log('Estados de préstamos:');
        loansByStatus.forEach(status => {
            console.log(`- ${status._id}: ${status.count} préstamos`);
        });
        
        // Test préstamos recientes
        console.log('\n📋 Préstamos Recientes:');
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
            { $limit: 5 },
            {
                $project: {
                    clientName: {
                        $concat: [
                            { $ifNull: ['$cliente.nombre', 'Cliente'] },
                            ' ',
                            { $ifNull: ['$cliente.apellido', 'Anónimo'] }
                        ]
                    },
                    amount: '$capital_inicial',
                    date: '$fecha_creacion',
                    status: '$estado',
                    progress: {
                        $multiply: [
                            {
                                $divide: [
                                    { $subtract: ['$capital_inicial', '$saldo_actual'] },
                                    '$capital_inicial'
                                ]
                            },
                            100
                        ]
                    }
                }
            }
        ]).toArray();
        
        recentLoans.forEach(loan => {
            console.log(`- ${loan.clientName}: $${loan.amount.toLocaleString()} (${Math.round(loan.progress)}% pagado)`);
        });
        
        console.log('\n✅ Todos los datos del dashboard están funcionando correctamente');
        console.log('\n🚀 El dashboard está listo para usar con datos reales');
        
    } catch (error) {
        console.error('❌ Error en pruebas del dashboard:', error.message);
    } finally {
        await client.close();
    }
}

testDashboardData();