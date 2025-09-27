// Sistema de gestión de fechas de pagos cada 15 días
// Este módulo maneja el cálculo de fechas de vencimiento y períodos de pago

class PaymentDateSystem {
    constructor() {
        this.PAYMENT_FREQUENCY_DAYS = 15;
    }

    /**
     * Calcula la fecha de vencimiento del próximo pago basado en la fecha de creación del préstamo
     * @param {Date} loanCreationDate - Fecha de creación del préstamo
     * @param {number} paymentNumber - Número de pago (1, 2, 3, etc.)
     * @returns {Date} Fecha de vencimiento del pago
     */
    calculatePaymentDueDate(loanCreationDate, paymentNumber) {
        const dueDate = new Date(loanCreationDate);
        dueDate.setDate(dueDate.getDate() + (paymentNumber * this.PAYMENT_FREQUENCY_DAYS));
        return dueDate;
    }

    /**
     * Calcula todos los períodos de pago para un préstamo
     * @param {Date} loanCreationDate - Fecha de creación del préstamo
     * @param {number} totalPayments - Número total de pagos
     * @returns {Array} Array de períodos con fechas de inicio y vencimiento
     */
    calculateAllPaymentPeriods(loanCreationDate, totalPayments) {
        const periods = [];
        
        for (let i = 1; i <= totalPayments; i++) {
            const startDate = new Date(loanCreationDate);
            startDate.setDate(startDate.getDate() + ((i - 1) * this.PAYMENT_FREQUENCY_DAYS));
            
            const dueDate = this.calculatePaymentDueDate(loanCreationDate, i);
            
            periods.push({
                periodNumber: i,
                startDate: startDate,
                dueDate: dueDate,
                status: 'pending'
            });
        }
        
        return periods;
    }

    /**
     * Determina en qué período de pago se encuentra una fecha específica
     * @param {Date} loanCreationDate - Fecha de creación del préstamo
     * @param {Date} paymentDate - Fecha del pago realizado
     * @returns {number} Número del período de pago
     */
    getPaymentPeriodNumber(loanCreationDate, paymentDate) {
        const daysDifference = Math.floor((paymentDate - loanCreationDate) / (1000 * 60 * 60 * 24));
        return Math.floor(daysDifference / this.PAYMENT_FREQUENCY_DAYS) + 1;
    }

    /**
     * Calcula los días de atraso para un pago
     * @param {Date} dueDate - Fecha de vencimiento
     * @param {Date} paymentDate - Fecha del pago realizado
     * @returns {number} Días de atraso (0 si no hay atraso)
     */
    calculateLateDays(dueDate, paymentDate) {
        const daysDifference = Math.floor((paymentDate - dueDate) / (1000 * 60 * 60 * 24));
        return Math.max(0, daysDifference);
    }

    /**
     * Calcula el estado de todos los pagos de un préstamo
     * @param {Object} loan - Objeto del préstamo
     * @param {Array} payments - Array de pagos realizados
     * @returns {Object} Estado detallado de los pagos
     */
    calculateLoanPaymentStatus(loan, payments) {
        const totalPayments = loan.plazo; // Número total de pagos esperados
        const periods = this.calculateAllPaymentPeriods(new Date(loan.fecha_creacion), totalPayments);
        
        // Agrupar pagos por período
        const paymentsByPeriod = {};
        payments.forEach(payment => {
            const periodNumber = this.getPaymentPeriodNumber(
                new Date(loan.fecha_creacion), 
                new Date(payment.fecha)
            );
            
            if (!paymentsByPeriod[periodNumber]) {
                paymentsByPeriod[periodNumber] = [];
            }
            paymentsByPeriod[periodNumber].push(payment);
        });

        // Actualizar estado de cada período
        periods.forEach(period => {
            const periodPayments = paymentsByPeriod[period.periodNumber] || [];
            const totalPaid = periodPayments.reduce((sum, p) => sum + p.monto, 0);
            
            period.payments = periodPayments;
            period.totalPaid = totalPaid;
            period.expectedAmount = this.calculateExpectedPayment(loan);
            
            if (totalPaid >= period.expectedAmount) {
                period.status = 'paid';
                // Calcular si hubo atraso
                const latestPayment = periodPayments.reduce((latest, p) => 
                    new Date(p.fecha) > new Date(latest.fecha) ? p : latest
                );
                period.lateDays = this.calculateLateDays(period.dueDate, new Date(latestPayment.fecha));
            } else if (new Date() > period.dueDate) {
                period.status = 'overdue';
                period.lateDays = this.calculateLateDays(period.dueDate, new Date());
            } else {
                period.status = 'pending';
                period.lateDays = 0;
            }
        });

        return {
            periods,
            totalPeriods: totalPayments,
            paidPeriods: periods.filter(p => p.status === 'paid').length,
            overduePeriods: periods.filter(p => p.status === 'overdue').length,
            pendingPeriods: periods.filter(p => p.status === 'pending').length
        };
    }

    /**
     * Calcula el monto esperado por período
     * @param {Object} loan - Objeto del préstamo
     * @returns {number} Monto esperado por período
     */
    calculateExpectedPayment(loan) {
        const capital = loan.capital_inicial;
        const interestRate = loan.tasa_interes / 100;
        const periods = loan.plazo;
        
        // Cálculo de interés por período de 15 días
        // Asumiendo tasa anual, dividimos entre 24 períodos (365/15 ≈ 24.33)
        const periodInterest = capital * interestRate / 24;
        const principalPayment = capital / periods;
        
        return principalPayment + periodInterest;
    }

    /**
     * Genera reporte de pagos por períodos de 15 días
     * @param {Array} loans - Array de préstamos
     * @param {Array} payments - Array de pagos
     * @param {Date} startDate - Fecha de inicio del reporte
     * @param {Date} endDate - Fecha de fin del reporte
     * @returns {Object} Reporte detallado por períodos
     */
    generatePeriodicReport(loans, payments, startDate, endDate) {
        const report = {
            periods: [],
            summary: {
                totalCollection: 0,
                totalInterest: 0,
                totalLateCharges: 0,
                totalPrincipal: 0
            }
        };

        // Crear períodos de 15 días entre las fechas
        const currentDate = new Date(startDate);
        let periodNumber = 1;

        while (currentDate <= endDate) {
            const periodEnd = new Date(currentDate);
            periodEnd.setDate(periodEnd.getDate() + this.PAYMENT_FREQUENCY_DAYS - 1);

            const periodPayments = payments.filter(payment => {
                const paymentDate = new Date(payment.fecha);
                return paymentDate >= currentDate && paymentDate <= periodEnd;
            });

            const periodData = {
                periodNumber,
                startDate: new Date(currentDate),
                endDate: new Date(Math.min(periodEnd, endDate)),
                payments: periodPayments.length,
                totalAmount: periodPayments.reduce((sum, p) => sum + p.monto, 0),
                principalPayments: periodPayments.filter(p => p.tipo === 'pago').reduce((sum, p) => sum + p.monto, 0),
                interestPayments: periodPayments.filter(p => p.tipo === 'interes').reduce((sum, p) => sum + p.monto, 0),
                lateCharges: periodPayments.filter(p => p.tipo === 'mora').reduce((sum, p) => sum + p.monto, 0)
            };

            report.periods.push(periodData);
            
            // Actualizar resumen
            report.summary.totalCollection += periodData.totalAmount;
            report.summary.totalPrincipal += periodData.principalPayments;
            report.summary.totalInterest += periodData.interestPayments;
            report.summary.totalLateCharges += periodData.lateCharges;

            // Avanzar al siguiente período
            currentDate.setDate(currentDate.getDate() + this.PAYMENT_FREQUENCY_DAYS);
            periodNumber++;
        }

        return report;
    }

    /**
     * Calcula métricas avanzadas considerando las fechas reales de pago
     * @param {Object} loan - Objeto del préstamo
     * @param {Array} payments - Array de pagos
     * @returns {Object} Métricas detalladas
     */
    calculateAdvancedMetrics(loan, payments) {
        const paymentStatus = this.calculateLoanPaymentStatus(loan, payments);
        const expectedPayment = this.calculateExpectedPayment(loan);
        
        // Calcular totales por tipo de pago
        const totalPaid = payments.reduce((sum, p) => sum + p.monto, 0);
        const principalPaid = payments.filter(p => p.tipo === 'pago').reduce((sum, p) => sum + p.monto, 0);
        const interestPaid = payments.filter(p => p.tipo === 'interes').reduce((sum, p) => sum + p.monto, 0);
        const lateChargesPaid = payments.filter(p => p.tipo === 'mora').reduce((sum, p) => sum + p.monto, 0);

        // Calcular saldo actual
        const remainingPrincipal = loan.capital_inicial - principalPaid;
        
        // Calcular días de mora promedio
        const overduePeriods = paymentStatus.periods.filter(p => p.lateDays > 0);
        const averageLateDays = overduePeriods.length > 0 
            ? overduePeriods.reduce((sum, p) => sum + p.lateDays, 0) / overduePeriods.length 
            : 0;

        return {
            // Métricas básicas
            expectedPaymentAmount: expectedPayment,
            totalPaid,
            principalPaid,
            interestPaid,
            lateChargesPaid,
            remainingPrincipal,
            
            // Métricas de períodos
            totalPeriods: paymentStatus.totalPeriods,
            paidPeriods: paymentStatus.paidPeriods,
            overduePeriods: paymentStatus.overduePeriods,
            pendingPeriods: paymentStatus.pendingPeriods,
            
            // Métricas de mora
            averageLateDays: Math.round(averageLateDays),
            totalLateDays: overduePeriods.reduce((sum, p) => sum + p.lateDays, 0),
            
            // Porcentajes
            paymentCompletionRate: (paymentStatus.paidPeriods / paymentStatus.totalPeriods * 100).toFixed(2),
            overdueRate: (paymentStatus.overduePeriods / paymentStatus.totalPeriods * 100).toFixed(2),
            
            // Estado del préstamo
            loanStatus: remainingPrincipal <= 0 ? 'paid' : 
                       paymentStatus.overduePeriods > 0 ? 'overdue' : 'current',
            
            // Detalles de períodos
            paymentPeriods: paymentStatus.periods
        };
    }
}

module.exports = PaymentDateSystem;