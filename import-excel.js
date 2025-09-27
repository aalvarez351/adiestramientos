require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
});

async function importarDatos(filename = '30deagosto.xlsx') {
  try {
    console.log(`🚀 Iniciando importación de datos desde Excel: ${filename}`);

    // Conectar a MongoDB
    await client.connect();
    console.log('✅ Conectado a MongoDB');

    const db = client.db('test');
    const collection = db.collection('clientes');

    // Verificar si existe el archivo Excel
    const excelPath = path.join(__dirname, filename);

    if (!fs.existsSync(excelPath)) {
      console.log(`⚠️  Archivo ${filename} no encontrado. Usando datos de ejemplo...`);
      await importSampleData(collection);
      return;
    }

    // Leer archivo Excel
    console.log('📖 Leyendo archivo Excel...');
    const workbook = XLSX.readFile(excelPath);

    // Buscar la hoja de datos (intentar múltiples nombres comunes)
    const possibleSheetNames = ['Datos', 'Sheet1', 'Hoja1', 'Data', 'datos'];
    let worksheet = null;
    let sheetName = '';

    for (const name of possibleSheetNames) {
      if (workbook.Sheets[name]) {
        worksheet = workbook.Sheets[name];
        sheetName = name;
        break;
      }
    }

    if (!worksheet) {
      throw new Error(`No se encontró una hoja de datos válida. Hojas disponibles: ${workbook.SheetNames.join(', ')}`);
    }

    console.log(`📋 Usando hoja: "${sheetName}"`);
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📊 Procesando ${jsonData.length} registros...`);

    // Procesar cada fila del Excel
    for (const row of jsonData) {
      await processExcelRow(collection, row);
    }

    // Crear índices para optimización
    await createIndexes(collection);

    console.log('✅ Importación completada exitosamente');

  } catch (error) {
    console.error('❌ Error en la importación:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Conexión cerrada');
  }
}

// Mantener compatibilidad con la función anterior
async function importExcelData() {
  return importarDatos();
}

async function processExcelRow(collection, row) {
  try {
    // Mapear datos del cliente
    const clientData = {
      nombre: row['Nombre del cliente'] || row['nombre'] || 'No disponible',
      apellido: row['Apellido del cliente'] || row['apellido'] || 'No disponible',
      telefono: row['Teléfono'] || row['telefono'] || 'No disponible',
      correo: row['Correo electrónico'] || row['correo'] || 'No disponible',
      direccion: row['Dirección'] || row['direccion'] || 'No disponible'
    };

    // Mapear datos financieros
    const accountData = {
      cuenta_id: new ObjectId(),
      fecha_creacion: parseDate(row['Fecha de creación'] || row['fecha_creacion']) || new Date(),
      saldo_total: parseFloat(row['Saldo total'] || row['saldo_total'] || 0),
      capital: parseFloat(row['Capital'] || row['capital'] || 0),
      interes_acumulado: parseFloat(row['Interés'] || row['interes'] || 0),
      atrasos: parseFloat(row['Atrasos'] || row['atrasos'] || 0),
      total: parseFloat(row['Total'] || row['total'] || 0),
      pagos: []
    };

    // Procesar pagos quincenales
    const pagosData = parsePaymentsData(row);
    accountData.pagos = pagosData;

    // Verificar si el cliente ya existe
    const existingClient = await collection.findOne({ correo: clientData.correo });

    if (existingClient) {
      // Actualizar cliente existente
      console.log(`🔄 Actualizando cliente existente: ${clientData.nombre} ${clientData.apellido}`);

      // Verificar si ya tiene esta cuenta
      const accountExists = existingClient.cuentas?.some(cuenta =>
        cuenta.fecha_creacion.getTime() === accountData.fecha_creacion.getTime()
      );

      if (!accountExists) {
        // Agregar nueva cuenta
        await collection.updateOne(
          { correo: clientData.correo },
          {
            $set: {
              nombre: clientData.nombre,
              apellido: clientData.apellido,
              telefono: clientData.telefono,
              direccion: clientData.direccion
            },
            $push: { cuentas: accountData }
          }
        );
      } else {
        // Actualizar cuenta existente
        await collection.updateOne(
          {
            correo: clientData.correo,
            'cuentas.fecha_creacion': accountData.fecha_creacion
          },
          {
            $set: {
              nombre: clientData.nombre,
              apellido: clientData.apellido,
              telefono: clientData.telefono,
              direccion: clientData.direccion,
              'cuentas.$.saldo_total': accountData.saldo_total,
              'cuentas.$.capital': accountData.capital,
              'cuentas.$.interes_acumulado': accountData.interes_acumulado,
              'cuentas.$.atrasos': accountData.atrasos,
              'cuentas.$.total': accountData.total
            },
            $push: { 'cuentas.$.pagos': { $each: accountData.pagos } }
          }
        );
      }
    } else {
      // Crear nuevo cliente
      console.log(`➕ Creando nuevo cliente: ${clientData.nombre} ${clientData.apellido}`);

      const newClient = {
        ...clientData,
        cuentas: [accountData]
      };

      await collection.insertOne(newClient);
    }

  } catch (error) {
    console.error('❌ Error procesando fila:', error.message, row);
  }
}

function parseDate(dateValue) {
  if (!dateValue) return null;

  try {
    if (typeof dateValue === 'number') {
      // Excel date serial number
      const excelEpoch = new Date(1900, 0, 1);
      return new Date(excelEpoch.getTime() + (dateValue - 1) * 24 * 60 * 60 * 1000);
    }

    if (typeof dateValue === 'string') {
      return new Date(dateValue);
    }

    return new Date(dateValue);
  } catch (error) {
    console.warn('⚠️  Error parseando fecha:', dateValue);
    return new Date();
  }
}

function parsePaymentsData(row) {
  const payments = [];

  // Buscar columnas de pagos (asumiendo patrón quincenal)
  const paymentColumns = Object.keys(row).filter(key =>
    key.toLowerCase().includes('pago') ||
    key.toLowerCase().includes('fecha_pago') ||
    key.toLowerCase().includes('monto_pago')
  );

  if (paymentColumns.length === 0) {
    // Si no hay columnas específicas, crear pagos basados en datos disponibles
    const basePayment = {
      pago_id: new ObjectId(),
      fecha_pago: parseDate(row['Fecha de pago'] || row['fecha_pago']) || new Date(),
      monto_pago: parseFloat(row['Pagos'] || row['pagos'] || 0),
      tipo: 'quincenal',
      capital_abonado: parseFloat(row['Capital'] || row['capital'] || 0),
      interes_pagado: parseFloat(row['Interés'] || row['interes'] || 0),
      atraso_pagado: parseFloat(row['Atrasos'] || row['atrasos'] || 0),
      saldo_restante: parseFloat(row['Saldo total'] || row['saldo_total'] || 0)
    };

    if (basePayment.monto_pago > 0) {
      payments.push(basePayment);
    }
  } else {
    // Procesar múltiples pagos si existen columnas específicas
    // Esta lógica se adaptaría según la estructura real del Excel
    for (let i = 1; i <= 10; i++) { // Asumir máximo 10 pagos
      const fechaKey = `Fecha Pago ${i}`;
      const montoKey = `Monto Pago ${i}`;

      if (row[fechaKey] && row[montoKey]) {
        payments.push({
          pago_id: new ObjectId(),
          fecha_pago: parseDate(row[fechaKey]),
          monto_pago: parseFloat(row[montoKey]),
          tipo: 'quincenal',
          capital_abonado: parseFloat(row[`Capital Pago ${i}`] || 0),
          interes_pagado: parseFloat(row[`Interés Pago ${i}`] || 0),
          atraso_pagado: parseFloat(row[`Atraso Pago ${i}`] || 0),
          saldo_restante: parseFloat(row[`Saldo Restante ${i}`] || 0)
        });
      }
    }
  }

  return payments;
}

async function createIndexes(collection) {
  console.log('🔍 Creando índices de optimización...');

  try {
    // Índice único para correo electrónico
    await collection.createIndex({ correo: 1 }, { unique: true });
    console.log('✅ Índice creado: correo (único)');

    // Índice para cuentas.cuenta_id
    await collection.createIndex({ 'cuentas.cuenta_id': 1 });
    console.log('✅ Índice creado: cuentas.cuenta_id');

    // Índice para pagos.fecha_pago
    await collection.createIndex({ 'cuentas.pagos.fecha_pago': 1 });
    console.log('✅ Índice creado: cuentas.pagos.fecha_pago');

    // Índice compuesto para búsquedas por cliente y fecha
    await collection.createIndex({ correo: 1, 'cuentas.pagos.fecha_pago': 1 });
    console.log('✅ Índice compuesto creado: correo + fecha_pago');

  } catch (error) {
    console.error('❌ Error creando índices:', error.message);
  }
}

async function importSampleData(collection) {
  console.log('📝 Importando datos de ejemplo...');

  const sampleData = [
    {
      nombre: 'Carlos',
      apellido: 'Gómez',
      telefono: '+50760000000',
      correo: 'carlos@email.com',
      direccion: 'Ciudad de Panamá',
      cuentas: [
        {
          cuenta_id: new ObjectId(),
          fecha_creacion: new Date('2025-01-01'),
          saldo_total: 1200.50,
          capital: 1000.00,
          interes_acumulado: 120.50,
          atrasos: 80.00,
          total: 1200.50,
          pagos: [
            {
              pago_id: new ObjectId(),
              fecha_pago: new Date('2025-01-15'),
              monto_pago: 100.00,
              tipo: 'quincenal',
              capital_abonado: 90.00,
              interes_pagado: 5.00,
              atraso_pagado: 5.00,
              saldo_restante: 1100.50
            },
            {
              pago_id: new ObjectId(),
              fecha_pago: new Date('2025-01-30'),
              monto_pago: 150.00,
              tipo: 'quincenal',
              capital_abonado: 130.00,
              interes_pagado: 15.00,
              atraso_pagado: 5.00,
              saldo_restante: 950.50
            }
          ]
        }
      ]
    },
    {
      nombre: 'María',
      apellido: 'Rodríguez',
      telefono: '+50760000001',
      correo: 'maria@email.com',
      direccion: 'San Miguelito',
      cuentas: [
        {
          cuenta_id: new ObjectId(),
          fecha_creacion: new Date('2025-01-15'),
          saldo_total: 800.00,
          capital: 750.00,
          interes_acumulado: 30.00,
          atrasos: 20.00,
          total: 800.00,
          pagos: [
            {
              pago_id: new ObjectId(),
              fecha_pago: new Date('2025-01-30'),
              monto_pago: 80.00,
              tipo: 'quincenal',
              capital_abonado: 70.00,
              interes_pagado: 8.00,
              atraso_pagado: 2.00,
              saldo_restante: 720.00
            }
          ]
        }
      ]
    }
  ];

  for (const clientData of sampleData) {
    try {
      const existingClient = await collection.findOne({ correo: clientData.correo });

      if (existingClient) {
        console.log(`🔄 Actualizando cliente existente: ${clientData.nombre} ${clientData.apellido}`);
        await collection.updateOne(
          { correo: clientData.correo },
          {
            $set: {
              nombre: clientData.nombre,
              apellido: clientData.apellido,
              telefono: clientData.telefono,
              direccion: clientData.direccion
            },
            $push: { cuentas: { $each: clientData.cuentas } }
          }
        );
      } else {
        console.log(`➕ Creando nuevo cliente: ${clientData.nombre} ${clientData.apellido}`);
        await collection.insertOne(clientData);
      }
    } catch (error) {
      console.error('❌ Error importando datos de ejemplo:', error.message);
    }
  }

  await createIndexes(collection);
  console.log('✅ Datos de ejemplo importados exitosamente');
}

// Ejecutar importación si se llama directamente
if (require.main === module) {
  importExcelData()
    .then(() => {
      console.log('🎉 Proceso de importación finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { importarDatos, importExcelData };