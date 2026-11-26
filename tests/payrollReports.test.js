import test from 'node:test';import assert from 'node:assert/strict';import {clBalance,csvReport} from '../src/pages/payrollReports.js';
test('CL credits and half day usage',()=>assert.equal(clBalance({id:'e',joiningDate:'2026-09-01'},'2026-11-20',[{employeeId:'e',type:'CL',date:'2026-10-01',days:.5}],12),2.5));
test('CL cap',()=>assert.equal(clBalance({id:'e',joiningDate:'2026-01-01'},'2026-11-20',[],3),3));
test('CSV escapes formula and quotes',()=>assert.match(csvReport([{employeeName:'=a"b',period:{start:'x',end:'y'}}]),/"'=a""b"/));
import {payslipPDF,payslipLines,reportRows} from '../src/pages/payrollReports.js';
const slip={employeeId:'EMP001',employeeName:'Arjun Kumar',period:{start:'2026-11-01',end:'2026-11-30'},month:'2026-11',base:28000,otPay:120,lop:0,shortagePay:0,emi:2000,net:26120,status:'Draft',issues:[{}]};
test('draft PDF download blocked',()=>assert.throws(()=>payslipPDF(slip),/approved/));
test('approved PDF has valid header and net amount',()=>{const pdf=payslipPDF({...slip,status:'Pending Payment'});assert.match(pdf,/^%PDF-1.4/);assert.match(pdf,/26,120.00/);assert.match(pdf,/%%EOF/);});
test('payslip totals and provisional export',()=>{assert.equal(payslipLines(slip).earnings.at(-1)[1],28120);assert.equal(payslipLines(slip).deductions.at(-1)[1],2000);assert.match(reportRows([slip])[0].at(-1),/Provisional/);});
