import {dailyPay,overlaps} from './payrollPolicy.js';
import {getAssignedShift} from './shiftAssignment.js';
const round=n=>Math.round((n+Number.EPSILON)*100)/100;
export function dates(start,end){const result=[];for(let d=start;d<=end;d=new Date(Date.parse(d)+86400000).toISOString().slice(0,10)){result.push(d);if(result.length>62)throw Error('Period too long.');}return result;}
export function calculatePayroll({employee,period,policy,salaries,attendance,shifts,assignments,leaves=[],loans=[],records=[],month,provisional=false,today=new Date().toISOString().slice(0,10)}){
 const id=employee.id;if(records.some(r=>r.employeeId===id&&overlaps(r.period,period)))throw Error('Payroll already exists for an overlapping period.');
 const history=salaries.filter(s=>s.employeeId===id).sort((a,b)=>b.effectiveDate.localeCompare(a.effectiveDate));
 const working=d=>!policy.weeklyOff.includes(new Date(d+'T00:00:00Z').getUTCDay())&&!policy.holidays.includes(d);
 const all=dates(period.start,period.end), eligible=all.filter(d=>d>=employee.joiningDate&&(!employee.endDate||d<=employee.endDate));
 let base=0,lop=0,otPay=0,shortagePay=0,ot=0,shortage=0;const details=[],issues=[];
 for(const d of eligible){const record=attendance.find(r=>r.employeeId===id&&r.date===d), leave=leaves.find(r=>r.employeeId===id&&r.date===d), nonWorking=!working(d);if(nonWorking&&!record)continue;
 const salary=history.find(s=>s.effectiveDate<=d);if(!salary)throw Error('Missing salary on '+d);
 const calendar=dates(d.slice(0,7)+'-01',new Date(Date.UTC(+d.slice(0,4),+d.slice(5,7),0)).toISOString().slice(0,10)).filter(working);
 const shift=record?.shiftSnapshot||getAssignedShift(id,d,shifts,assignments);const expected=calendar.reduce((sum,x)=>sum+(getAssignedShift(id,x,shifts,assignments)?.expectedMinutes||shift?.expectedMinutes||0),0);
 const daily=salary.total/calendar.length;if(!nonWorking)base+=daily;
 if(!nonWorking&&leave?.type==='LOP')lop+=daily*leave.days;
 if(provisional&&d>today){issues.push({date:d,reason:'Future attendance'});continue;}
 if(!nonWorking&&!record&&leave?.days!==1){if(!provisional)throw Error('Resolve attendance on '+d);issues.push({date:d,reason:'Missing attendance'});continue;}
 if(nonWorking&&record?.status==='Absent')continue;
 let p;try{p=dailyPay({record,shift,leave:nonWorking?0:leave?.days||0,nonWorking,policy,monthlySalary:salary.total,monthlyExpectedMinutes:expected});}catch(e){if(!provisional||!['Attendance requires resolution.','Invalid fixed shift attendance.'].includes(e.message))throw e;issues.push({date:d,reason:e.message});continue;}ot+=p.ot;shortage+=p.shortage;otPay+=p.otPay;shortagePay+=p.shortagePay;details.push({date:d,...p});}
 const available=Math.max(0,round(base+otPay-lop-shortagePay));let remaining=available;const deductions=[];
 for(const loan of loans.filter(l=>l.employeeId===id&&l.status==='Approved'&&l.startMonth<=month)){const paid=(loan.payments||[]).reduce((s,p)=>s+p.amount,0);const [year,mon]=month.split("-").map(Number);const [sy,sm]=loan.startMonth.split("-").map(Number);const elapsed=Math.max(0,(year-sy)*12+mon-sm+1);const due=round(Math.min(Math.max(0,loan.amount-paid),Math.max(0,Math.min(loan.amount,elapsed*loan.emi)-paid)));if((loan.payments||[]).some(p=>p.month===month))continue;const amount=round(Math.min(remaining,due));remaining=round(remaining-amount);deductions.push({loanId:loan.id,amount,unpaid:round(due-amount)});}
 return {employeeId:id,employeeName:employee.name,period,month,policy:{...policy},base:round(base),lop:round(lop),ot,shortage,otPay:round(otPay),shortagePay:round(shortagePay),emi:round(available-remaining),net:remaining,deductions,details,issues,status:'Draft'};
}
export function transition(row,action,{isSuper,today,reason='',reference=''}){if(!isSuper)throw Error('Super Admin approval required.');if(action==='approve'&&row.status==='Draft'&&!(row.issues||[]).length&&today>row.period.end)return {...row,status:'Pending Payment',approvedAt:today};if(action==='pay'&&row.status==='Pending Payment'&&reference.trim())return {...row,status:'Paid',paymentDate:today,reference};if(action==='reopen'&&row.status==='Pending Payment'&&reason.trim())return {...row,status:'Draft',audit:[...(row.audit||[]),{action,reason,date:today}]};throw Error('Invalid action or missing required information.');}
