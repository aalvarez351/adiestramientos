require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 60000,
  maxPoolSize: 20,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
  waitQueueTimeoutMS: 5000,
  retryWrites: true,
  retryReads: true
});

async function importarDatosCorrectamente(filename = '30deagosto.xlsx') {
  try {
    console.log(`🚀 Iniciando importación correcta desde: ${filename}`);

    await client.connect();
    console.log('✅ Conectado a MongoDB');

    const db = client.db('test');
    
    const excelPath = path.join(__dirname, filename);
    if (!fs.existsSync(excelPath)) {
      throw new Error(`❌ Archivo ${filename} no encontrado`);
    }

    const stats = fs.statSync(excelPath);
    console.log(`📁 Tamaño del archivo: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    // Limpiar datos existentes
    await limpiarDatos(db);

    // Leer Excel
    console.log('📖 Leyendo archivo Excel...');
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });

    console.log(`📊 Total de registros: ${jsonData.length}`);

    // Procesar y agrupar datos
    const clientesMap = new Map();
    let registrosProcesados = 0;

    for (const row of jsonData) {
      const nombreCompleto = limpiarTexto(row['Nombre']);
      
      // Saltar filas vacías
      if (!nombreCompleto) continue;
      
      const fechaStr = limpiarTexto(row['Fecha']);
      const lugar = limpiarTexto(row['Lugar']);
      const pagos = parseNumero(row['Pagos']);
      const interes = parseNumero(row['Interes']);
      const atraso = parseNumero(row['Atraso']);
      const total = parseNumero(row['Total']);
      const abono = parseNumero(row['Abono']);
      const capital = parseNumero(row['Capital']);
      const saldo = parseNumero(row['Saldo']);
      
      // Solo procesar si hay datos financieros relevantes
      if (capital <= 0 && saldo <= 0 && abono <= 0) continue;
      
      // Crear o actualizar cliente
      if (!clientesMap.has(nombreCompleto)) {
        const partesNombre = nombreCompleto.split(' ');
        const nombre = partesNombre[0] || 'Cliente';
        const apellido = partesNombre.slice(1).join(' ') || 'Anónimo';
        
        const emailCounter = clientesMap.size + 1;
        clientesMap.set(nombreCompleto, {
          _id: new ObjectId(),
          nombre,
          apellido,
          telefono: 'No disponible',
          email: `cliente${emailCounter}@prestamos.com`,
          direccion: lugar || 'No disponible',
          tipo: 'individual',
          fecha_registro: parsearFecha(fechaStr) || new Date(),
          prestamos: [],
          pagos: [],
          capitalTotal: 0,
          saldoActual: 0,
          pagosTotal: 0,
          interesTotal: 0,
          atrasoTotal: 0
        });
      }
      
      const cliente = clientesMap.get(nombreCompleto);
      
      // Actualizar totales del cliente (acumular capital, mantener saldo más reciente)
      if (capital > 0) cliente.capitalTotal += capital;
      if (saldo > 0) cliente.saldoActual = saldo; // El saldo más reciente
      if (abono > 0) cliente.pagosTotal += abono;
      if (interes > 0) cliente.interesTotal += interes;
      if (atraso > 0) cliente.atrasoTotal += atraso;
      
      // Agregar movimiento/pago si hay abono
      if (abono > 0) {
        cliente.pagos.push({
          _id: new ObjectId(),
          fecha: parsearFecha(fechaStr) || new Date(),
          monto: abono,
          tipo: 'pago',
          comprobante: `AUTO-${fechaStr}`,
          capital_abonado: capital || 0,
          saldo_restante: saldo || 0,
          interes_pagado: interes || 0,
          atraso_pagado: atraso || 0
        });
      }
      
      registrosProcesados++;
      
      if (registrosProcesados % 5000 === 0) {
        console.log(`📊 Procesados ${registrosProcesados} registros...`);
      }
    }

    console.log(`✅ Registros procesados: ${registrosProcesados}`);
    console.log(`👥 Clientes únicos encontrados: ${clientesMap.size}`);

    // Crear préstamos para cada cliente
    const clientesParaInsertar = [];
    const prestamosParaInsertar = [];
    const pagosParaInsertar = [];

    for (const cliente of clientesMap.values()) {
      // Solo crear si tiene datos financieros
      if (cliente.capitalTotal > 0 || cliente.saldoActual > 0) {
        // Crear préstamo principal
        const prestamoId = new ObjectId();
        const capitalInicial = cliente.capitalTotal || cliente.saldoActual || 1000;
        
        const prestamo = {
          _id: prestamoId,
          cliente_id: cliente._id,
          capital_inicial: capitalInicial,
          plazo: 12,
          frecuencia_pago: 'quincenal',
          tasa_interes: 15,
          condiciones_mora: 'Mora del 5% después de 3 días',
          estado: cliente.saldoActual > 0 ? 'activo' : 'pagado',
          fecha_creacion: cliente.fecha_registro,
          saldo_actual: cliente.saldoActual || 0,
          total_pagado: cliente.pagosTotal || 0,
          interes_acumulado: cliente.interesTotal || 0,
          atraso_acumulado: cliente.atrasoTotal || 0
        };

        cliente.prestamos = [prestamoId];
        prestamosParaInsertar.push(prestamo);

        // Asociar pagos al préstamo
        cliente.pagos.forEach(pago => {
          pago.prestamo_id = prestamoId;
          pago.registrado_por = 'sistema';
          pago.fecha_registro = new Date();
          pagosParaInsertar.push(pago);
        });

        // Limpiar datos temporales
        delete cliente.capitalTotal;
        delete cliente.saldoActual;
        delete cliente.pagosTotal;
        delete cliente.interesTotal;
        delete cliente.atrasoTotal;
        delete cliente.pagos;

        clientesParaInsertar.push(cliente);
      }
    }

    // Insertar en base de datos
    console.log('💾 Insertando datos en MongoDB...');
    
    if (clientesParaInsertar.length > 0) {
      const resultClientes = await db.collection('clientes').insertMany(clientesParaInsertar);
      console.log(`✅ Insertados ${resultClientes.insertedCount} clientes`);
    }

    if (prestamosParaInsertar.length > 0) {
      const resultPrestamos = await db.collection('prestamos').insertMany(prestamosParaInsertar);
      console.log(`✅ Insertados ${resultPrestamos.insertedCount} préstamos`);
    }

    if (pagosParaInsertar.length > 0) {
      const resultPagos = await db.collection('pagos').insertMany(pagosParaInsertar);
      console.log(`✅ Insertados ${resultPagos.insertedCount} pagos`);
    }

    // Crear índices
    await crearIndices(db);

    console.log('🎉 Importación completada exitosamente!');

  } catch (error) {
    console.error('❌ Error en importación:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Conexión cerrada');
  }
}

async function limpiarDatos(db) {
  console.log('🧹 Limpiando datos existentes...');
  
  const collections = ['clientes', 'prestamos', 'pagos'];
  
  for (const collectionName of collections) {
    const collection = db.collection(collectionName);
    const count = await collection.countDocuments();
    
    if (count > 0) {
      await collection.deleteMany({});
      console.log(`🗑️  Eliminados ${count} registros de ${collectionName}`);
    }
  }
  
  console.log('✅ Limpieza completada');
}

async function crearIndices(db) {
  console.log('🔍 Creando índices optimizados...');
  
  try {
    await db.collection('clientes').createIndexes([
      { key: { email: 1 } },
      { key: { nombre: 1, apellido: 1 } },
      { key: { telefono: 1 } }
    ]);
    
    await db.collection('prestamos').createIndexes([
      { key: { cliente_id: 1 } },
      { key: { estado: 1 } },
      { key: { fecha_creacion: -1 } },
      { key: { saldo_actual: 1 } }
    ]);
    
    await db.collection('pagos').createIndexes([
      { key: { prestamo_id: 1 } },
      { key: { fecha: -1 } },
      { key: { tipo: 1 } }
    ]);
    
    console.log('✅ Índices creados exitosamente');
  } catch (error) {
    console.error('❌ Error creando índices:', error.message);
  }
}

function limpiarTexto(texto) {
  if (!texto) return '';
  return String(texto).trim().replace(/\s+/g, ' ');
}

function parseNumero(valor) {
  if (!valor) return 0;
  
  // Convertir a string y limpiar
  const str = String(valor).replace(/,/g, '').replace(/[^\d.-]/g, '');
  const num = parseFloat(str);
  
  return isNaN(num) ? 0 : num;
}

function parsearFecha(fecha) {
  if (!fecha) return new Date();
  
  try {
    if (typeof fecha === 'number') {
      const excelEpoch = new Date(1900, 0, 1);
      return new Date(excelEpoch.getTime() + (fecha - 1) * 24 * 60 * 60 * 1000);
    }
    
    if (typeof fecha === 'string') {
      const parsed = new Date(fecha);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    }
    
    return new Date(fecha);
  } catch (error) {
    return new Date();
  }
}

async function verificarImportacion() {
  try {
    await client.connect();
    const db = client.db('test');
    
    const clientesCount = await db.collection('clientes').countDocuments();
    const prestamosCount = await db.collection('prestamos').countDocuments();
    const pagosCount = await db.collection('pagos').countDocuments();
    
    console.log('📊 Resumen de importación:');
    console.log(`   Clientes: ${clientesCount}`);
    console.log(`   Préstamos: ${prestamosCount}`);
    console.log(`   Pagos: ${pagosCount}`);
    
    // Mostrar algunos ejemplos
    if (clientesCount > 0) {
      const ejemploCliente = await db.collection('clientes').findOne();
      console.log('\n👤 Ejemplo de cliente:');
      console.log(`   Nombre: ${ejemploCliente.nombre} ${ejemploCliente.apellido}`);
      console.log(`   Email: ${ejemploCliente.email}`);
    }
    
    if (prestamosCount > 0) {
      const ejemploPrestamo = await db.collection('prestamos').findOne();
      console.log('\n💰 Ejemplo de préstamo:');
      console.log(`   Capital inicial: $${ejemploPrestamo.capital_inicial}`);
      console.log(`   Saldo actual: $${ejemploPrestamo.saldo_actual}`);
      console.log(`   Estado: ${ejemploPrestamo.estado}`);
    }
    
    return { clientesCount, prestamosCount, pagosCount };
  } catch (error) {
    console.error('❌ Error verificando importación:', error.message);
    throw error;
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  const filename = process.argv[2] || '30deagosto.xlsx';
  
  importarDatosCorrectamente(filename)
    .then(() => {
      console.log('\n🎉 Importación masiva completada');
      return verificarImportacion();
    })
    .then((stats) => {
      console.log('\n✅ Verificación completada:', stats);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { importarDatosCorrectamente, verificarImportacion };