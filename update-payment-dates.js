// Script para actualizar datos existentes con el sistema de fechas cada 15 días
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const PaymentDateSystem = require('./payment-date-system');

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);
const paymentDateSystem = new PaymentDateSystem();

async function updatePaymentDates() {
    try {
        console.log('🔄 Iniciando actualización de fechas de pagos...');
        await client.connect();
        const db = client.db('test');

        // 1. Actualizar préstamos existentes con cronogramas de pago
        console.log('📅 Actualizando cronogramas de préstamos...');
        const prestamos = await db.collection('prestamos').find({}).toArray();
        
        for (const prestamo of prestamos) {
            try {
                // Generar cronograma de pagos
                const cronogramaPagos = paymentDateSystem.calculateAllPaymentPeriods(
                    new Date(prestamo.fecha_creacion),
                    prestamo.plazo
                );

                // Calcular pago esperado por período
                const pagoEsperado = paymentDateSystem.calculateExpectedPayment(prestamo);

                // Obtener pagos del préstamo
                const pagos = await db.collection('pagos')
                    .find({ prestamo_id: prestamo._id })
                    .toArray();

                // Calcular métricas avanzadas
                const metricas = paymentDateSystem.calculateAdvancedMetrics(prestamo, pagos);

                // Actualizar préstamo
                await db.collection('prestamos').updateOne(
                    { _id: prestamo._id },
                    {
                        $set: {
                            cronograma_pagos: cronogramaPagos,
                            pago_esperado_periodo: pagoEsperado,
                            dias_mora: metricas.averageLateDays,
                            periodos_pagados: metricas.paidPeriods,
                            periodos_vencidos: metricas.overduePeriods,
                            tasa_cumplimiento: parseFloat(metricas.paymentCompletionRate),
                            estado_detallado: metricas.loanStatus,
                            ultima_actualizacion: new Date(),
                            // Asegurar que la frecuencia sea 15 días
                            frecuencia_pago: '15 días'
                        }
                    }
                );

                console.log(`✅ Préstamo ${prestamo._id} actualizado`);
            } catch (error) {
                console.error(`❌ Error actualizando préstamo ${prestamo._id}:`, error.message);
            }
        }

        // 2. Actualizar pagos existentes con información de períodos
        console.log('💰 Actualizando información de períodos en pagos...');
        const pagos = await db.collection('pagos').find({}).toArray();
        
        for (const pago of pagos) {
            try {
                // Obtener información del préstamo
                const prestamo = await db.collection('prestamos')
                    .findOne({ _id: pago.prestamo_id });

                if (prestamo) {
                    // Calcular número de período
                    const numeroPeriodo = paymentDateSystem.getPaymentPeriodNumber(
                        new Date(prestamo.fecha_creacion),
                        new Date(pago.fecha)
                    );

                    // Calcular fecha de vencimiento esperada
                    const fechaVencimiento = paymentDateSystem.calculatePaymentDueDate(
                        new Date(prestamo.fecha_creacion),
                        numeroPeriodo
                    );

                    // Calcular días de atraso
                    const diasAtraso = paymentDateSystem.calculateLateDays(
                        fechaVencimiento,
                        new Date(pago.fecha)
                    );

                    // Actualizar pago
                    await db.collection('pagos').updateOne(
                        { _id: pago._id },
                        {
                            $set: {
                                periodo_numero: numeroPeriodo,
                                fecha_vencimiento_esperada: fechaVencimiento,
                                dias_atraso: diasAtraso,
                                periodo_15_dias: true,
                                fecha_actualizacion: new Date()
                            }
                        }
                    );
                }
            } catch (error) {
                console.error(`❌ Error actualizando pago ${pago._id}:`, error.message);
            }
        }

        // 3. Crear índices para optimizar consultas por fechas
        console.log('🔍 Creando índices para optimización...');
        
        await db.collection('pagos').createIndex({ 
            "fecha": 1, 
            "periodo_numero": 1 
        });
        
        await db.collection('pagos').createIndex({ 
            "prestamo_id": 1, 
            "periodo_numero": 1 
        });
        
        await db.collection('prestamos').createIndex({ 
            "fecha_creacion": 1, 
            "estado": 1 
        });

        await db.collection('prestamos').createIndex({ 
            "dias_mora": 1, 
            "estado_detallado": 1 
        });

        // 4. Generar reporte de actualización
        console.log('📊 Generando reporte de actualización...');
        
        const [
            totalPrestamos,
            totalPagos,
            prestamosActualizados,
            pagosActualizados
        ] = await Promise.all([
            db.collection('prestamos').countDocuments(),
            db.collection('pagos').countDocuments(),
            db.collection('prestamos').countDocuments({ cronograma_pagos: { $exists: true } }),
            db.collection('pagos').countDocuments({ periodo_numero: { $exists: true } })
        ]);

        const reporte = {
            fecha_actualizacion: new Date(),
            prestamos: {
                total: totalPrestamos,
                actualizados: prestamosActualizados,
                porcentaje: ((prestamosActualizados / totalPrestamos) * 100).toFixed(2)
            },
            pagos: {
                total: totalPagos,
                actualizados: pagosActualizados,
                porcentaje: ((pagosActualizados / totalPagos) * 100).toFixed(2)
            },
            indices_creados: [
                'pagos.fecha + periodo_numero',
                'pagos.prestamo_id + periodo_numero',
                'prestamos.fecha_creacion + estado',
                'prestamos.dias_mora + estado_detallado'
            ]
        };

        // Guardar reporte
        await db.collection('system_updates').insertOne({
            tipo: 'actualizacion_fechas_pagos',
            reporte,
            timestamp: new Date()
        });

        console.log('✅ Actualización completada exitosamente!');
        console.log('📋 Reporte de actualización:');
        console.log(`   • Préstamos actualizados: ${reporte.prestamos.actualizados}/${reporte.prestamos.total} (${reporte.prestamos.porcentaje}%)`);
        console.log(`   • Pagos actualizados: ${reporte.pagos.actualizados}/${reporte.pagos.total} (${reporte.pagos.porcentaje}%)`);
        console.log(`   • Índices creados: ${reporte.indices_creados.length}`);

        return reporte;

    } catch (error) {
        console.error('❌ Error durante la actualización:', error);
        throw error;
    } finally {
        await client.close();
    }
}

// Función para corregir fechas de pagos que no coinciden con períodos de 15 días
async function correctPaymentDates() {
    try {
        console.log('🔧 Iniciando corrección de fechas de pagos...');
        await client.connect();
        const db = client.db('test');

        const pagosIncorrectos = [];
        const pagos = await db.collection('pagos').find({}).toArray();

        for (const pago of pagos) {
            const prestamo = await db.collection('prestamos')
                .findOne({ _id: pago.prestamo_id });

            if (prestamo) {
                const fechaCreacion = new Date(prestamo.fecha_creacion);
                const fechaPago = new Date(pago.fecha);
                
                // Calcular el período más cercano
                const diasDesdePrestamo = Math.floor((fechaPago - fechaCreacion) / (1000 * 60 * 60 * 24));
                const periodoCalculado = Math.floor(diasDesdePrestamo / 15) + 1;
                const fechaCorrecta = paymentDateSystem.calculatePaymentDueDate(fechaCreacion, periodoCalculado);
                
                // Si la diferencia es mayor a 7 días, considerar corrección
                const diferenciaDias = Math.abs((fechaPago - fechaCorrecta) / (1000 * 60 * 60 * 24));
                
                if (diferenciaDias > 7) {
                    pagosIncorrectos.push({
                        pago_id: pago._id,
                        prestamo_id: prestamo._id,
                        fecha_original: fechaPago,
                        fecha_sugerida: fechaCorrecta,
                        diferencia_dias: Math.round(diferenciaDias),
                        periodo_calculado: periodoCalculado
                    });
                }
            }
        }

        console.log(`🔍 Encontrados ${pagosIncorrectos.length} pagos con fechas que podrían necesitar corrección`);

        // Guardar reporte de fechas incorrectas
        if (pagosIncorrectos.length > 0) {
            await db.collection('payment_date_corrections').insertOne({
                fecha_analisis: new Date(),
                pagos_incorrectos: pagosIncorrectos,
                total_pagos_analizados: pagos.length,
                porcentaje_incorrectos: ((pagosIncorrectos.length / pagos.length) * 100).toFixed(2)
            });

            console.log('📋 Reporte de correcciones guardado en collection "payment_date_corrections"');
        }

        return {
            total_pagos: pagos.length,
            pagos_incorrectos: pagosIncorrectos.length,
            porcentaje: ((pagosIncorrectos.length / pagos.length) * 100).toFixed(2),
            correcciones: pagosIncorrectos.slice(0, 10) // Mostrar solo las primeras 10
        };

    } catch (error) {
        console.error('❌ Error durante la corrección de fechas:', error);
        throw error;
    } finally {
        await client.close();
    }
}

// Función principal
async function main() {
    try {
        const args = process.argv.slice(2);
        
        if (args.includes('--correct-dates')) {
            const resultado = await correctPaymentDates();
            console.log('\n📊 Resultado del análisis de fechas:');
            console.log(JSON.stringify(resultado, null, 2));
        } else {
            const resultado = await updatePaymentDates();
            console.log('\n🎉 Actualización completada exitosamente!');
        }
    } catch (error) {
        console.error('💥 Error en el proceso:', error);
        process.exit(1);
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    main();
}

module.exports = {
    updatePaymentDates,
    correctPaymentDates
};