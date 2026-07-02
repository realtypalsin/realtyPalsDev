"use strict";
// backend/src/lib/calculators.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatInr = formatInr;
exports.calcEmi = calcEmi;
exports.calcStampDuty = calcStampDuty;
exports.calcGst = calcGst;
function formatInr(amount) {
    if (amount >= 1_00_00_000)
        return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`;
    if (amount >= 1_00_000)
        return `₹${(amount / 1_00_000).toFixed(2)} L`;
    return `₹${amount.toLocaleString('en-IN')}`;
}
function calcEmi(principalCr, annualRatePct, tenureYears) {
    const P = principalCr * 1_00_00_000;
    const r = annualRatePct / 1200;
    const n = tenureYears * 12;
    if (r === 0)
        return { emi: P / n, totalPayment: P, totalInterest: 0 };
    const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalPayment = emi * n;
    return { emi, totalPayment, totalInterest: totalPayment - P };
}
function calcStampDuty(priceCr, gender = 'male') {
    const price = priceCr * 1_00_00_000;
    const rate = gender === 'female' ? 6 : 7; // UP rates
    const stampDuty = (price * rate) / 100;
    const registration = price * 0.01;
    return { stampDuty, registration, total: stampDuty + registration, rate };
}
function calcGst(priceCr, status, carpetSqm = 0) {
    if (status === 'ready_to_move')
        return { gst: 0, rate: 0, category: 'OC received — no GST' };
    const price = priceCr * 1_00_00_000;
    const isAffordable = priceCr < 0.45 && carpetSqm > 0 && carpetSqm <= 60;
    const rate = isAffordable ? 1 : 5;
    return { gst: (price * rate) / 100, rate, category: isAffordable ? 'affordable_housing' : 'standard' };
}
