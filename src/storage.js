export const PREFIX = 'hrms-demo-v1:';
export const KEYS = ['roles','admins','employees','attendance','correctionRequests','shifts','shiftAssignments','overtimeRequests','salaryRecords','salaryComponents','employeeLoans','employeeOwnership','employeeAccessRequests','payrollPolicies','monthlyRecords','payrollLeaves'];
export function initializeStorage(storage, defaults) {
  // Existing installations are never reseeded, even if individual collections are empty.
  if (storage.getItem(PREFIX+'initialized') !== null || KEYS.some(k=>storage.getItem(PREFIX+k)!==null)) {
    storage.setItem(PREFIX+'initialized','1'); return false;
  }
  for(const k of KEYS) storage.setItem(PREFIX+k,JSON.stringify(defaults[k]??[]));
  storage.setItem(PREFIX+'initialized','1'); return true;
}
export function exportBackup(storage) {
  const data={};
  for(let i=0;i<storage.length;i++){const key=storage.key(i);if(key?.startsWith(PREFIX)&&key!==PREFIX+'initialized') data[key.slice(PREFIX.length)]=JSON.parse(storage.getItem(key));}
  return {format:'hrms-local-backup',version:1,createdAt:new Date().toISOString(),data};
}
export function validateBackup(backup) {
  if(backup?.format!=='hrms-local-backup'||backup.version!==1||!backup.data||typeof backup.data!=='object'||Array.isArray(backup.data)) throw Error('Invalid HRMS backup format.');
  for(const k of KEYS){const rows=backup.data[k]??(["employeeOwnership","employeeAccessRequests","payrollPolicies","monthlyRecords","payrollLeaves"].includes(k)?[]:undefined);if(!Array.isArray(rows)||rows.some(r=>!r||typeof r!=='object'||Array.isArray(r)||typeof r.id!=='string'||!r.id)||new Set(rows.map(r=>r.id)).size!==rows.length) throw Error('Invalid or duplicate records in '+k);}
  const ids=k=>new Set(backup.data[k].map(r=>r.id)); const employees=ids('employees'), shifts=ids('shifts'), roles=ids('roles');
  for(const k of ['attendance','shiftAssignments','salaryRecords','employeeLoans','correctionRequests','overtimeRequests']) for(const r of backup.data[k]) if(!employees.has(r.employeeId)) throw Error('Unknown employee in '+k);
  for(const r of backup.data.shiftAssignments) if(!shifts.has(r.shiftId)) throw Error('Unknown assigned shift.');
  for(const r of backup.data.admins) if(!roles.has(r.roleId)) throw Error('Unknown admin role.');
  return {...backup.data,employeeOwnership:backup.data.employeeOwnership??[],employeeAccessRequests:backup.data.employeeAccessRequests??[],payrollPolicies:backup.data.payrollPolicies??[],monthlyRecords:backup.data.monthlyRecords??[],payrollLeaves:backup.data.payrollLeaves??[]};
}
export function restoreBackup(storage,backup){const data=validateBackup(backup);const previous=exportBackup(storage).data;try{for(const k of KEYS)storage.setItem(PREFIX+k,JSON.stringify(data[k]));storage.setItem(PREFIX+'initialized','1');}catch(e){for(const k of KEYS){if(Object.hasOwn(previous,k))storage.setItem(PREFIX+k,JSON.stringify(previous[k]));else storage.removeItem(PREFIX+k);}throw e;}}
