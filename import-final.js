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

async function importarDatosCompleto(filename = '30deagosto.xlsx') {
  try {
    console.log(`🚀 Iniciando importación completa desde: ${filename}`);

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
      const nombreCompleto = limpiarTexto(row['2']);
      
      // Saltar encabezados y filas vacías
      if (!nombreCompleto || nombreCompleto === 'Nombre') continue;
      
      const fechaStr = limpiarTexto(row['0']);
      const lugar = limpiarTexto(row['1']);
      const pagos = parseFloat(row['5'] || 0);
      const interes = parseFloat(row['7'] || 0);
      const atraso = parseFloat(row['8'] || 0);
      const total = parseFloat(row['9'] || 0);
      const abono = parseFloat(row['10'] || 0);
      const capital = parseFloat(row['11'] || 0);
      const saldo = parseFloat(row['12'] || 0);
      
      // Solo procesar si hay datos financieros relevantes
      if (capital <= 0 && saldo <= 0 && abono <= 0) continue;
      
      // Crear o actualizar cliente
      if (!clientesMap.has(nombreCompleto)) {
        const partesNombre = nombreCompleto.split(' ');
        const nombre = partesNombre[0] || 'Cliente';
        const apellido = partesNombre.slice(1).join(' ') || 'Anónimo';
        
        clientesMap.set(nombreCompleto, {
          _id: new ObjectId(),
          nombre,
          apellido,
          telefono: 'No disponible',
          email: `${nombre.toLowerCase().replace(/[^a-z]/g, '')}.${apellido.toLowerCase().replace(/[^a-z]/g, '')}@noemail.com`,
          direccion: lugar || 'No disponible',
          tipo: 'individual',
          fecha_registro: parsearFecha(fechaStr) || new Date(),
          prestamos: [],
          pagos: [],
          capitalTotal: 0,
          saldoTotal: 0,
          pagosTotal: 0
        });
      }
      
      const cliente = clientesMap.get(nombreCompleto);
      
      // Actualizar totales del cliente
      if (capital > 0) cliente.capitalTotal += capital;
      if (saldo > 0) cliente.saldoTotal = saldo; // El saldo más reciente
      if (abono > 0) cliente.pagosTotal += abono;
      
      // Agregar movimiento/pago si hay abono
      if (abono > 0) {
        cliente.pagos.push({
          _id: new ObjectId(),
          fecha: parsearFecha(fechaStr) || new Date(),
          monto: abono,
          tipo: 'pago',
          comprobante: `AUTO-${fechaStr}`,
          capital_abonado: capital || 0,
          saldo_restante: saldo || 0
        });
      }
      
      registrosProcesados++;
      
      if (registrosProcesados % 1000 === 0) {
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
      if (cliente.capitalTotal > 0 || cliente.saldoTotal > 0) {
        // Crear préstamo principal
        const prestamoId = new ObjectId();
        const prestamo = {
          _id: prestamoId,
          cliente_id: cliente._id,
          capital_inicial: cliente.capitalTotal || cliente.saldoTotal || 1000,
          plazo: 12,
          frecuencia_pago: 'quincenal',
          tasa_interes: 15,
          condiciones_mora: 'Mora del 5% después de 3 días',
          estado: cliente.saldoTotal > 0 ? 'activo' : 'pagado',
          fecha_creacion: cliente.fecha_registro,
          saldo_actual: cliente.saldoTotal || 0,
          total_pagado: cliente.pagosTotal || 0,
          interes_acumulado: 0,
          atraso_acumulado: 0
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
        delete cliente.saldoTotal;
        delete cliente.pagosTotal;
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
      { key: { email: 1 }, unique: true, sparse: true },
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
  
  importarDatosCompleto(filename)
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

module.exports = { importarDatosCompleto, verificarImportacion };