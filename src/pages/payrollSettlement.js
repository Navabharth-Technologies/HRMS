import {dates} from './monthlyPayroll.js';
import {clBalance} from './payrollReports.js';
export function leaveSnapshot(row,leaves){return leaves.filter(l=>l.employeeId===row.employeeId&&l.date>=row.period.start&&l.date<=row.period.end).map(l=>({...l})).sort((a,b)=>a.date.localeCompare(b.date));}
export function validateLeaveSettlement(row,employee,leaves){const selected=leaveSnapshot(row,leaves);for(const l of selected.filter(l=>l.type==='CL')){if(clBalance(employee,l.date,leaves.filter(x=>x.id!==l.id),row.policy.clCap)<l.days)throw Error('Insufficient CL on '+l.date);}return selected;}
export function unprocessedDays(employee,period,records,policy){return dates(period.start,period.end).filter(d=>d>=employee.joiningDate&&(!employee.endDate||d<=employee.endDate)&&!policy.weeklyOff.includes(new Date(d+'T00:00:00Z').getUTCDay())&&!policy.holidays.includes(d)&&!records.some(r=>r.employeeId===employee.id&&r.status!=='Draft'&&r.period.start<=d&&r.period.end>=d));}

// Reservations are confirmed leave; settlement is derived from finalized payroll.
export function leaveLedger(employee,month,leaves,records,cap){
 const end=new Date(Date.UTC(+month.slice(0,4),+month.slice(5,7),0)).toISOString().slice(0,10);
 const settled=new Set(records.filter(r=>r.employeeId===employee.id&&['Paid','Pending Payment'].includes(r.status)).flatMap(r=>(r.settledLeaves||[]).map(l=>l.id)));
 const entries=leaves.filter(l=>l.employeeId===employee.id&&l.type==='CL'&&l.date<=end).map(l=>({...l,state:settled.has(l.id)?'Settled':'Reserved'}));
 return {entries,available:clBalance(employee,end,leaves,cap),reserved:entries.filter(l=>l.state==='Reserved').reduce((s,l)=>s+l.days,0),settled:entries.filter(l=>l.state==='Settled').reduce((s,l)=>s+l.days,0)};
}
export function historicalPeriods(employee,through,records,policy){
 const result=[];for(let m=employee.joiningDate.slice(0,7);m<=through.slice(0,7);){const [y,n]=m.split('-').map(Number);const end=new Date(Date.UTC(y,n,0)).toISOString().slice(0,10);const days=unprocessedDays(employee,{start:m+'-01',end:end<through?end:through},records,policy);if(days.length)result.push({month:m,days});m=new Date(Date.UTC(y,n,1)).toISOString().slice(0,7);}return result;
}
export function queueAdjustment(row,{id,amount,reason,actor,isSuper,today}){if(!isSuper||row.status!=='Paid'||!Number.isFinite(amount)||!amount||Math.abs(amount)>100000000||!reason.trim()||!id)throw Error('Paid payroll, valid amount and reason required.');return {...row,adjustments:[...(row.adjustments||[]),{id,amount:Math.round(amount*100)/100,reason:reason.trim(),actor,date:today}],audit:[...(row.audit||[]),{action:'queue adjustment',id,actor,date:today,reason:reason.trim()}]};}
export function applyAdjustments(row,records){const used=new Set(records.filter(r=>r.id!==row.id&&r.status!=='Draft').flatMap(r=>(r.appliedAdjustments||[]).map(a=>a.id)));const pending=records.filter(r=>r.employeeId===row.employeeId&&r.status==='Paid'&&r.period.end<row.period.start).flatMap(r=>r.adjustments||[]).filter(a=>!used.has(a.id));const amount=Math.round(pending.reduce((s,a)=>s+a.amount,0)*100)/100;if(row.net+amount<0)throw Error('Adjustment exceeds available net pay; review before generating.');return {...row,appliedAdjustments:pending,adjustment:amount,net:Math.round((row.net+amount)*100)/100};}
