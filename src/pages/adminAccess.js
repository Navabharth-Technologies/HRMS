export function ownerOf(id, assignments, date) {
 return assignments.filter(a=>a.employeeId===id&&a.effectiveFrom<=date).sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom))[0]?.adminId||null;
}
export function allowedIds({admin,employees,admins,assignments,requests,date,module,roles}) {
 if(!admin||admin.status!=='Active'||!roles.find(r=>r.id===admin.roleId)?.permissions.includes(module))return [];
 const protectedIds=new Set(admins.map(a=>a.employeeId).filter(Boolean));
 return employees.filter(e=>!protectedIds.has(e.id)&&(ownerOf(e.id,assignments,date)===admin.id||requests.some(r=>r.adminId===admin.id&&r.employeeId===e.id&&r.status==='Approved'&&r.kind==='Temporary'&&r.start<=date&&r.end>=date&&(module!=='Payroll'||r.payroll)))).map(e=>e.id);
}
export function assignEmployees({ids,adminId,date,reason,employees,admins,assignments,today}) {
 if(!reason.trim()||date<today||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!ids.length||!admins.some(a=>a.id===adminId&&a.status==='Active'))throw Error('Select an active administrator, employees, effective date and reason.');
 if(ids.some(id=>!employees.some(e=>e.id===id&&e.status==='Active')||admins.some(a=>a.employeeId===id)||assignments.some(a=>a.employeeId===id&&a.effectiveFrom===date)))throw Error('Invalid employee or conflicting assignment date.');
 return [...assignments,...[...new Set(ids)].map(employeeId=>({id:crypto.randomUUID(),employeeId,adminId,effectiveFrom:date,reason}))];
}
export function scopedUpdate(previous,update,ids,key='employeeId',allowNew=false){const allowed=new Set(ids);const visible=previous.filter(r=>allowed.has(r[key]));const next=typeof update==='function'?update(visible):update;return [...previous.filter(r=>!allowed.has(r[key])),...next.filter(r=>allowed.has(r[key])||(allowNew&&!previous.some(p=>p[key]===r[key])))];}
