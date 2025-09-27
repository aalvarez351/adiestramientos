require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

async function verificarDatosDashboard() {
  try {
    console.log('🔍 Verificando datos para el dashboard...');
    
    await client.connect();
    const db = client.db('test');
    
    // Verificar clientes
    const clientesCount = await db.collection('clientes').countDocuments();
    console.log(`👥 Total clientes: ${clientesCount}`);
    
    if (clientesCount > 0) {
      const ejemploCliente = await db.collection('clientes').findOne();
      console.log('📋 Ejemplo de cliente:', {
        nombre: ejemploCliente.nombre,
        apellido: ejemploCliente.apellido,
        email: ejemploCliente.email,
        telefono: ejemploCliente.telefono
      });
    }
    
    // Verificar préstamos
    const prestamosCount = await db.collection('prestamos').countDocuments();
    console.log(`💰 Total préstamos: ${prestamosCount}`);
    
    if (prestamosCount > 0) {
      const prestamosActivos = await db.collection('prestamos').countDocuments({ estado: 'activo' });
      const prestamosPagados = await db.collection('prestamos').countDocuments({ estado: 'pagado' });
      
      console.log(`   - Activos: ${prestamosActivos}`);
      console.log(`   - Pagados: ${prestamosPagados}`);
      
      const ejemploPrestamo = await db.collection('prestamos').findOne();
      console.log('📋 Ejemplo de préstamo:', {
        capital_inicial: ejemploPrestamo.capital_inicial,
        saldo_actual: ejemploPrestamo.saldo_actual,
        estado: ejemploPrestamo.estado,
        cliente_id: ejemploPrestamo.cliente_id
      });
    }
    
    // Verificar pagos
    const pagosCount = await db.collection('pagos').countDocuments();
    console.log(`💳 Total pagos: ${pagosCount}`);
    
    if (pagosCount > 0) {
      const totalPagado = await db.collection('pagos').aggregate([
        { $group: { _id: null, total: { $sum: '$monto' } } }
      ]).toArray();
      
      const pagosPorTipo = await db.collection('pagos').aggregate([
        { $group: { _id: '$tipo', count: { $sum: 1 }, total: { $sum: '$monto' } } }
      ]).toArray();
      
      console.log(`   - Total pagado: $${totalPagado[0]?.total?.toLocaleString() || 0}`);
      console.log('   - Por tipo:');
      pagosPorTipo.forEach(tipo => {
        console.log(`     ${tipo._id}: ${tipo.count} pagos, $${tipo.total.toLocaleString()}`);
      });
    }
    
    // Verificar integridad de datos
    console.log('\n🔗 Verificando integridad de datos...');
    
    // Préstamos con información de cliente
    const prestamosConCliente = await db.collection('prestamos').aggregate([
      {
        $lookup: {
          from: 'clientes',
          localField: 'cliente_id',
          foreignField: '_id',
          as: 'cliente_info'
        }
      },
      { $limit: 5 }
    ]).toArray();
    
    console.log(`✅ Préstamos con información de cliente: ${prestamosConCliente.length > 0 ? 'OK' : 'ERROR'}`);
    
    if (prestamosConCliente.length > 0) {
      const ejemplo = prestamosConCliente[0];
      if (ejemplo.cliente_info && ejemplo.cliente_info.length > 0) {
        console.log('   Ejemplo:', {
          cliente: `${ejemplo.cliente_info[0].nombre} ${ejemplo.cliente_info[0].apellido}`,
          capital: ejemplo.capital_inicial,
          estado: ejemplo.estado
        });
      }
    }
    
    // Pagos con información de préstamo y cliente
    const pagosConInfo = await db.collection('pagos').aggregate([
      {
        $lookup: {
          from: 'prestamos',
          localField: 'prestamo_id',
          foreignField: '_id',
          as: 'prestamo_info'
        }
      },
      {
        $lookup: {
          from: 'clientes',
          localField: 'prestamo_info.cliente_id',
          foreignField: '_id',
          as: 'cliente_info'
        }
      },
      { $limit: 5 }
    ]).toArray();
    
    console.log(`✅ Pagos con información completa: ${pagosConInfo.length > 0 ? 'OK' : 'ERROR'}`);
    
    // Estadísticas para el dashboard
    console.log('\n📊 Estadísticas para dashboard:');
    
    const carteraTotal = await db.collection('prestamos').aggregate([
      { $group: { _id: null, total: { $sum: '$capital_inicial' } } }
    ]).toArray();
    
    console.log(`💰 Cartera total: $${carteraTotal[0]?.total?.toLocaleString() || 0}`);
    
    const saldosPendientes = await db.collection('prestamos').aggregate([
      { $match: { estado: 'activo' } },
      { $group: { _id: null, total: { $sum: '$saldo_actual' } } }
    ]).toArray();
    
    console.log(`📈 Saldos pendientes: $${saldosPendientes[0]?.total?.toLocaleString() || 0}`);
    
    console.log('\n✅ Verificación completada');
    
  } catch (error) {
    console.error('❌ Error en verificación:', error.message);
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  verificarDatosDashboard()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { verificarDatosDashboard };