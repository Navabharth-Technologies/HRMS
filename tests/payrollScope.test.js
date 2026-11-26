import test from 'node:test';
import assert from 'node:assert/strict';
import {payrollEmployees} from '../src/pages/payrollScope.js';
const employees=[{id:'1'},{id:'2'},{id:'3'}];
test('unlinked administrators do not exclude employees',()=>assert.deepEqual(payrollEmployees(employees,[{}, {employeeId:''}]),employees));
test('linked administrator is separated from employee payroll',()=>{const admins=[{employeeId:2}];assert.deepEqual(payrollEmployees(employees,admins),[employees[0],employees[2]]);assert.deepEqual(payrollEmployees(employees,admins,true),[employees[1]]);});
