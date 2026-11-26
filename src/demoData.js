import { getLocalDate } from './pages/shiftAssignment.js';
export function makeDemoData() {
 const today=getLocalDate(); const start=today.slice(0,7)+'-01';
 const fixed=(id,name,startTime,endTime,expectedMinutes,breaks)=>({id,name,type:'Fixed',startTime,endTime,expectedMinutes,allowedBreakMinutes:breaks.reduce((n,b)=>n+mins(b.end)-mins(b.start),0),breaks});
 const mins=t=>Number(t.slice(0,2))*60+Number(t.slice(3));
 const b=(id,name,start,end)=>({id,name,start,end});
 const shifts=[fixed('DEMO-G','General Shift','09:00','18:00',450,[b('g1','Morning Break','11:00','11:15'),b('g2','Lunch','13:00','14:00'),b('g3','Afternoon Break','15:00','15:15')]),fixed('DEMO-M','Morning Shift','06:00','14:00',435,[b('m1','Break','08:00','08:15'),b('m2','Lunch','11:00','11:30')]),fixed('DEMO-E','Evening Shift','14:00','22:00',435,[b('e1','Break','16:00','16:15'),b('e2','Dinner','19:00','19:30')]),{id:'DEMO-F',name:'Flexible Shift',type:'Flexible',startTime:'',endTime:'',expectedMinutes:480,allowedBreakMinutes:0,breaks:[]}];
 const names=['Arjun Kumar','Sneha Rao','Kiran Shetty','Ananya Rao','Vikram Das','Meera Jain','Rohan Patel','Divya Hegde','Nikhil Rao','Kavya Shah','Aditya Sen','Neha Das','Varun Pai','Isha Jain','Manoj Rao','Pooja Das','Rahul Pai','Asha Sen','Ravi Shah','Nisha Rao'];
 const departments=['Development','Human Resources','Finance','Operations','Marketing'];
 const employees=names.map((name,i)=>({id:'EMP'+String(i+1).padStart(3,'0'),name,email:`demo${i+1}@example.com`,phone:String(9000000000+i),department:departments[i%5],designation:['Developer','HR Executive','Accountant','Operations Executive','Marketing Executive'][i%5],joiningDate:start,status:i===2||i===19?'Inactive':'Active',bank:{holderName:'',bankName:'',accountNumber:'',ifsc:''},documents:[]}));
 const shiftAssignments=employees.filter(e=>e.status==='Active').map((e,i)=>({id:'DA'+i,employeeId:e.id,shiftId:shifts[i%4].id,effectiveFrom:start}));
 const next=new Date(); next.setDate(next.getDate()+7); const future=[next.getFullYear(),String(next.getMonth()+1).padStart(2,'0'),String(next.getDate()).padStart(2,'0')].join('-');
 shiftAssignments.push({id:'DA-future',employeeId:'EMP001',shiftId:'DEMO-M',effectiveFrom:future});
 const attendance=shiftAssignments.filter(a=>a.effectiveFrom===start&&a.shiftId!=='DEMO-F').map((a,i)=>{const s=shifts.find(x=>x.id===a.shiftId);return {id:'DR'+i,employeeId:a.employeeId,date:today,status:i%7===6?'Absent':'Present',checkIn:i%7===6?'':s.startTime,checkOut:i%7===6?'':i%3===0?String(Number(s.endTime.slice(0,2))+1).padStart(2,'0')+':00':s.endTime,breaks:i%7===6?[]:s.breaks.map(x=>({breakId:x.id,name:x.name,start:x.start,end:x.end,type:'Scheduled'})),source:'Biometric Simulation',shiftSnapshot:structuredClone(s)};});
 const salaryComponents=[{id:'basic',name:'Basic Salary',type:'Earning'},{id:'hra',name:'HRA',type:'Earning'},{id:'allowance',name:'Other Allowance',type:'Earning'}];
 const salaryRecords=employees.filter(e=>e.status==='Active').map((e,i)=>({id:'DS'+i,employeeId:e.id,effectiveDate:start,amounts:{basic:20000+i*500,hra:5000,allowance:3000},components:salaryComponents,total:28000+i*500,reason:'Demo salary',type:'Initial',createdAt:new Date().toISOString()}));
 const employeeLoans=[{id:'DL1',employeeId:'EMP001',amount:20000,emi:2000,startMonth:today.slice(0,7),purpose:'Demo loan',status:'Approved',payments:[],history:[],createdAt:new Date().toISOString()}];
 return {employees,shifts,shiftAssignments,attendance,salaryComponents,salaryRecords,employeeLoans};
}
