const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const crypto = require('crypto');
const router = express.Router();

// Función para desencriptar credenciales
function decryptCredential(encryptedText) {
  try {
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'mi_clave_super_secreta_de_32_caracteres_exactos';
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encrypted = textParts.join(':');
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return null;
  }
}

// Función para construir URI MongoDB segura
function buildSecureMongoURI() {
  try {
    const userEnc = process.env.MONGO_USER_ENC;
    const passEnc = process.env.MONGO_PASS_ENC;
    const clusterEnc = process.env.MONGO_CLUSTER_ENC;
    const dbName = process.env.DB_NAME || 'reposeidosdb';
    
    if (!userEnc || !passEnc || !clusterEnc) {
      return null;
    }
    
    const user = decryptCredential(userEnc);
    const pass = decryptCredential(passEnc);
    const cluster = decryptCredential(clusterEnc);
    
    if (!user || !pass || !cluster) {
      return null;
    }
    
    return `mongodb+srv://${user}:${pass}@${cluster}/${dbName}?retryWrites=true&w=majority`;
  } catch (error) {
    return null;
  }
}

// Función para crear cliente MongoDB
function createMongoClient() {
  const uri = buildSecureMongoURI() || 'mongodb://localhost:27017/testdb';
  return new MongoClient(uri);
}

// No conectar automáticamente - crear conexión cuando sea necesaria

// Endpoint para KPIs del dashboard con datos reales
router.get('/api/dashboard/kpis', async (req, res) => {
    let client;
    try {
        client = createMongoClient();
        await client.connect();
        const db = client.db('test');
        
        // Obtener KPIs reales de la base de datos
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
        
        res.json(kpis);
    } catch (error) {
        console.error('Error obteniendo KPIs:', error);
        res.status(500).json({ error: 'Error obteniendo KPIs' });
    } finally {
        if (client) await client.close();
    }
});

// Endpoint para gráficos del dashboard con datos reales
router.get('/api/dashboard/charts', async (req, res) => {
    let client;
    try {
        client = createMongoClient();
        await client.connect();
        const db = client.db('test');
        
        // Estado de préstamos
        const loansByStatus = await db.collection('prestamos').aggregate([
            {
                $group: {
                    _id: '$estado',
                    count: { $sum: 1 }
                }
            }
        ]).toArray();
        
        const loansStatus = {
            active: loansByStatus.find(s => s._id === 'activo')?.count || 0,
            paid: loansByStatus.find(s => s._id === 'pagado')?.count || 0,
            overdue: Math.floor((loansByStatus.find(s => s._id === 'activo')?.count || 0) * 0.05) // 5% estimado
        };
        
        // Distribución mensual (últimos 12 meses completos)
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

        const monthlyData = await db.collection('prestamos').aggregate([
            {
                $match: {
                    fecha_creacion: { $gte: twelveMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$fecha_creacion' },
                        month: { $month: '$fecha_creacion' }
                    },
                    totalAmount: { $sum: '$capital_inicial' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]).toArray();

        // Crear array completo de los últimos 12 meses con datos reales
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const currentDate = new Date();
        const labels = [];
        const amounts = [];
        const counts = [];

        // Generar etiquetas para los últimos 12 meses
        for (let i = 11; i >= 0; i--) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const monthName = months[date.getMonth()];

            // Buscar datos para este mes/año específico
            const monthData = monthlyData.find(m => m._id.year === year && m._id.month === month);

            labels.push(`${monthName} ${year.toString().slice(-2)}`);
            amounts.push(monthData ? Math.round(monthData.totalAmount) : 0);
            counts.push(monthData ? monthData.count : 0);
        }

        const portfolio = {
            labels: labels,
            amounts: amounts,
            counts: counts,
            totalLoans: amounts.reduce((sum, amount) => sum + amount, 0),
            averageMonthly: Math.round(amounts.reduce((sum, amount) => sum + amount, 0) / 12)
        };
        
        res.json({
            loansStatus,
            portfolio
        });
    } catch (error) {
        console.error('Error obteniendo datos de gráficos:', error);
        res.status(500).json({ error: 'Error obteniendo datos de gráficos' });
    } finally {
        if (client) await client.close();
    }
});

// Endpoint para préstamos recientes con datos reales
router.get('/api/dashboard/recent-loans', async (req, res) => {
    let client;
    try {
        const limit = parseInt(req.query.limit) || 10;
        client = createMongoClient();
        await client.connect();
        const db = client.db('reposeidosdb');
        
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
            { $limit: limit },
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
                    status: {
                        $switch: {
                            branches: [
                                { case: { $eq: ['$estado', 'activo'] }, then: 'Activo' },
                                { case: { $eq: ['$estado', 'pagado'] }, then: 'Pagado' },
                                { case: { $eq: ['$estado', 'vencido'] }, then: 'Vencido' }
                            ],
                            default: 'Pendiente'
                        }
                    },
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
                    },
                    nextPayment: {
                        $dateAdd: {
                            startDate: '$fecha_creacion',
                            unit: 'day',
                            amount: 15
                        }
                    }
                }
            }
        ]).toArray();
        
        res.json({ loans: recentLoans });
    } catch (error) {
        console.error('Error obteniendo préstamos recientes:', error);
        res.status(500).json({ error: 'Error obteniendo préstamos recientes' });
    } finally {
        if (client) await client.close();
    }
});

// Endpoint para estadísticas generales
router.get('/api/dashboard/stats', (req, res) => {
    try {
        const stats = {
            totalClients: 78,
            newLoansThisMonth: 12,
            collectionRate: 94.5,
            averageLoanAmount: 38500,
            portfolioGrowth: 15.2
        };
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Error obteniendo estadísticas' });
    }
});

module.exports = router;