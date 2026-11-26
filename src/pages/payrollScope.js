export function payrollEmployees(employees, admins, adminPayroll = false) {
  const linked = new Set(admins.map(a => a.employeeId).filter(id => id != null && String(id).trim() !== '').map(String));
  return employees.filter(e => {
    const id = e.id ?? e.employeeId;
    return id != null && String(id).trim() !== '' && linked.has(String(id)) === adminPayroll;
  });
}
