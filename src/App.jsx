import AuthGate, { AccountControls } from "./pages/AuthGate.jsx";
import {readAccounts,validSession,SESSION_KEY} from "./authDemo.js";
import { payrollEmployees } from "./pages/payrollScope.js";

import { useState } from "react";
import {
  House,
  ShieldCheck,
  Users,
  Wallet,
  UserCheck,
  Clock,
  ArrowRight,
  CalendarDays,
} from "lucide-react";

import AdminManagement from "./pages/AdminManagement";
import RoleManagement from "./pages/RoleManagement";
import EmployeeManagement from "./pages/EmployeeManagement";
import AttendanceManagement from "./pages/AttendanceManagement";
import ShiftManagement from "./pages/ShiftManagement";
import OvertimeManagement from "./pages/OvertimeManagement";
import PayrollManagement from "./pages/PayrollManagement";

import { getShiftAssignment } from "./pages/shiftAssignment.js";
import "./App.css";
import useStoredState from "./useStoredState.js";
import { makeDemoData } from "./demoData.js";
import { initializeStorage, exportBackup, restoreBackup, validateBackup } from "./storage.js";

import EmployeeAccess from "./pages/EmployeeAccess.jsx";
import {allowedIds,scopedUpdate} from "./pages/adminAccess.js";
const menuItems = [
  { icon: House, name: "Dashboard" },
  { icon: ShieldCheck, name: "Admins" },
  { icon: Users, name: "Employees" },
  { icon: Wallet, name: "Payroll" },
];

const initialRoles = [
  {
    id: "1",
    name: "HR Admin",
    permissions: ["Employees", "Attendance"],
  },
  {
    id: "2",
    name: "Attendance Admin",
    permissions: ["Attendance"],
  },
  {
    id: "3",
    name: "Payroll Admin",
    permissions: ["Payroll"],
  },
];

const initialAdmins = [
  {
    id: "1",
    name: "Rahul Sharma",
    email: "rahul@example.com",
    roleId: "1",
    status: "Active",
  },
  {
    id: "2",
    name: "Priya Rao",
    email: "priya@example.com",
    roleId: "2",
    status: "Active",
  },
  {
    id: "3",
    name: "Amit Kumar",
    email: "amit@example.com",
    roleId: "3",
    status: "Inactive",
  },
];

const emptyBank = {
  holderName: "",
  bankName: "",
  accountNumber: "",
  ifsc: "",
};

const initialEmployees = [
  {
    id: "EMP001",
    name: "Arjun Kumar",
    email: "arjun@example.com",
    phone: "9876543210",
    department: "Development",
    designation: "Frontend Developer",
    joiningDate: "2026-01-15",
    status: "Active",
    bank: { ...emptyBank },
    documents: [],
  },
  {
    id: "EMP002",
    name: "Sneha Rao",
    email: "sneha@example.com",
    phone: "9876543211",
    department: "Human Resources",
    designation: "HR Executive",
    joiningDate: "2026-02-10",
    status: "Active",
    bank: { ...emptyBank },
    documents: [],
  },
  {
    id: "EMP003",
    name: "Kiran Shetty",
    email: "kiran@example.com",
    phone: "9876543212",
    department: "Finance",
    designation: "Accountant",
    joiningDate: "2026-03-05",
    status: "Inactive",
    bank: { ...emptyBank },
    documents: [],
  },
];

function getToday() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

// Initialize before React reads stored state. Never replace existing records.
try { initializeStorage(localStorage, { ...makeDemoData(), roles: initialRoles, admins: initialAdmins }); }
catch (error) { console.error("HRMS storage initialization failed", error); }

function App() {
  // Navigation
  const [activePage, setActivePage] = useState("Dashboard");

  const [adminTab, setAdminTab] = useState("Administrators");
  const [employeeTab, setEmployeeTab] = useState("Employee List");

  // Admin and employee data
  const [roles, setRoles] = useStoredState("roles", initialRoles);
  const [admins, setAdmins] = useStoredState("admins", initialAdmins);
  const [employees, setEmployees] = useStoredState("employees", initialEmployees);

  const [session,setSession]=useState(()=>{try{return JSON.parse(sessionStorage.getItem(SESSION_KEY)||"null");}catch{return null;}});
  const authenticated=validSession(session,admins,readAccounts());
  const actorId=authenticated?(session.id==="super"?"":session.id):"__signed_out__";
  const [ownership,setOwnership]=useStoredState("employeeOwnership",[]);
  const [accessRequests,setAccessRequests]=useStoredState("employeeAccessRequests",[]);
  const actor=admins.find(a=>a.id===actorId&&a.status==="Active");
  const isSuper=!actorId;
  const displayName = isSuper ? "Super Admin" : actor?.name || "Access unavailable";
  const displayRole = isSuper ? "System Administrator" : roles.find(r => r.id === actor?.roleId)?.name || "Administrator";
  const initials = displayName.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join("").toUpperCase();
  const permits=module=>isSuper||!!actor&&!!roles.find(r=>r.id===actor?.roleId)?.permissions.includes(module);
  const idsFor=module=>isSuper?employees.map(e=>e.id):allowedIds({admin:actor,employees,admins,assignments:ownership,requests:accessRequests,date:getToday(),module,roles});
  const scoped=(rows,module,key="employeeId")=>isSuper?rows:rows.filter(r=>idsFor(module).includes(r[key]));
  const writer=(setter,module,key="employeeId")=>isSuper?setter:update=>setter(old=>scopedUpdate(old,update,idsFor(module),key));
  const changeActor=id=>{const next={id,version:readAccounts()[id].version};sessionStorage.setItem(SESSION_KEY,JSON.stringify(next));setSession(next);setActivePage("Dashboard");setEmployeeTab("Employee List");setAdminTab("Administrators");setCorrectionTarget(null);};
  const logout=()=>{sessionStorage.removeItem(SESSION_KEY);setSession(null);setActivePage("Dashboard");setCorrectionTarget(null);};
  function updateAdmins(update){const next=typeof update==="function"?update(admins):update;const disabled=admins.filter(a=>a.status==="Active"&&next.some(n=>n.id===a.id&&n.status!=="Active")).map(a=>a.id);if(disabled.length){setOwnership(old=>old.filter(a=>!(disabled.includes(a.adminId)&&a.effectiveFrom>=getToday())).concat(employees.filter(e=>disabled.includes(old.filter(a=>a.employeeId===e.id&&a.effectiveFrom<=getToday()).sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom))[0]?.adminId)).map(e=>({id:crypto.randomUUID(),employeeId:e.id,adminId:null,effectiveFrom:getToday(),reason:"Administrator deactivated"}))));setAccessRequests(old=>old.map(r=>disabled.includes(r.adminId)?{...r,status:"Revoked"}:r));}setAdmins(next);}
  // Attendance
  const [attendance, setAttendance] = useStoredState("attendance", []);
  const [correctionRequests, setCorrectionRequests] = useStoredState("correctionRequests", []);
  const [correctionTarget, setCorrectionTarget] = useState(null);

  // Shifts
  const [shifts, setShifts] = useStoredState("shifts", []);
  const [shiftAssignments, setShiftAssignments] = useStoredState("shiftAssignments", []);

  // Current assignments for the legacy overtime screen only
  const currentAssignments = employees.map(employee =>
    getShiftAssignment(employee.id, getToday(), shiftAssignments)
  ).filter(Boolean);

  // Overtime
  const [overtimeRequests, setOvertimeRequests] = useStoredState("overtimeRequests", []);

  // Payroll
  const [monthlyRecords,setMonthlyRecords]=useStoredState("monthlyRecords",[]);
  const [payrollLeaves,setPayrollLeaves]=useStoredState("payrollLeaves",[]);
  const [payrollPolicies,setPayrollPolicies]=useStoredState("payrollPolicies",[]);
  const [salaryRecords, setSalaryRecords] = useStoredState("salaryRecords", []);

  const [salaryComponents, setSalaryComponents] = useStoredState("salaryComponents", [
    { id: "basic", name: "Basic Salary", type: "Earning" },
    { id: "hra", name: "HRA", type: "Earning" },
    { id: "allowance", name: "Other Allowance", type: "Earning" },
  ]);

  // Employee loans
  const [employeeLoans, setEmployeeLoans] = useStoredState("employeeLoans", []);

  function downloadBackup() {
    try {
      const backup = exportBackup(localStorage);
      validateBackup(backup);
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url; link.download = `HRMS-backup-${getToday()}.json`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { window.alert(error.message); }
  }

  async function importBackup(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text());
      validateBackup(backup);
      if (!window.confirm("Restore this backup? This replaces current records. Download a current backup first if needed.")) return;
      restoreBackup(localStorage, backup);
      window.location.reload();
    } catch (error) { window.alert(`Restore failed: ${error.message}`); }
  }

  // Dashboard counts
  const activeAdmins = admins.filter(
    (admin) => admin.status === "Active"
  ).length;

  const presentToday = attendance.filter(
    (record) =>
      record.date === getToday() &&
      record.status === "Present"
  ).length;

  const pendingOvertime = overtimeRequests.filter(
    (request) => request.status === "Pending"
  ).length;

  const today = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  function navigate(page) {
    if ((page==="Admins Payroll"&&!isSuper)||(page==="Admins"&&!isSuper)||(page==="Payroll"&&!permits("Payroll"))||(page==="Employees"&&!permits("Employees")&&!permits("Attendance"))) return;
    if (page !== "Employees") setCorrectionTarget(null);
    setActivePage(page);
    window.scrollTo(0, 0);
  }

  function openAdminTab(tab) {
    setAdminTab(tab);
    navigate("Admins");
  }

  function openEmployeeTab(tab) {
    setEmployeeTab(tab);
    navigate("Employees");
  }

  function requestCorrection(employeeId, date) {
    const record = attendance.find(item => item.employeeId === employeeId && item.date === date);
    if (!record || !permits("Attendance") || !idsFor("Attendance").includes(employeeId)) return;
    setCorrectionTarget({ employeeId, date, recordId: record.id });
    openEmployeeTab("Attendance");
  }

  // Dashboard
  function renderDashboard() {
    const stats = [
      {
        title: "Total Employees",
        value: scoped(employees,"Employees","id").length,
        icon: Users,
        color: "indigo",
        action: () => openEmployeeTab("Employee List"),
      },
      {
        title: "Present Today",
        value: isSuper?presentToday:scoped(attendance,"Attendance").filter(r=>r.date===getToday()&&r.status==="Present").length,
        icon: UserCheck,
        color: "green",
        action: () => openEmployeeTab("Attendance"),
      },
      {
        title: "Active Admins",
        value: activeAdmins,
        icon: ShieldCheck,
        color: "indigo",
        action: () => openAdminTab("Administrators"),
      },
      {
        title: "Pending Overtime",
        value: isSuper?pendingOvertime:scoped(overtimeRequests,"Attendance").filter(r=>r.status==="Pending").length,
        icon: Clock,
        color: "indigo",
        action: () => openEmployeeTab("Overtime"),
      },
    ];

    const modules = [
      {
        title: "Admins",
        icon: ShieldCheck,
        description:
          "Manage administrators, assign roles and control access permissions.",
        action: () => openAdminTab("Administrators"),
      },
      {
        title: "Employees",
        icon: Users,
        description:
          "Manage employee records, daily attendance, shifts and working hours.",
        action: () => openEmployeeTab("Employee List"),
      },
      {
        title: "Employee Payroll",
        icon: Wallet,
        description:
          "Manage salary structures and employee loans.",
        action: () => navigate("Payroll"),
      },
      ...(isSuper?[{title:"Admins Payroll",icon:Wallet,description:"Manage administrator salaries.",action:()=>navigate("Admins Payroll")}]:[]),
    ];

    return (
      <div className="hrms-dashboard">
        <div className="dashboard-heading">
          <div>
            <h1>Dashboard</h1>
            <p>
              Manage your workforce, attendance and payroll
              from one place.
            </p>
          </div>

          <div className="dashboard-meta">
            <span className="dashboard-date">
              <CalendarDays size={16} />
              {today}
            </span>

            <span className="demo-tag">Demo Mode</span>
            {isSuper&&<><button type="button" className="hrms-backup-action" onClick={downloadBackup}>Download Backup</button>
            <label className="hrms-backup-action">Restore Backup<input type="file" accept=".json,application/json" onChange={importBackup} className="hrms-backup-input" /></label></>}
          </div>
        </div>

        <section className="dashboard-welcome" aria-label="Welcome">
          <span className="welcome-eyebrow">Your HR workspace</span>
          <h2>Great workplaces start with great people.</h2>
          <p>Welcome back, {displayName}. Let's make today productive.</p>
        </section>

        {/* Statistics cards */}
        <div className="dashboard-stats">
          {stats.filter(item=>isSuper||(item.title==="Total Employees"?permits("Employees"):item.title!=="Active Admins"&&permits("Attendance"))).map((item) => {
            const Icon = item.icon;

            return (
              <button
                type="button"
                className="dashboard-stat"
                key={item.title}
                onClick={item.action}
              >
                <div className="stat-top">
                  <div className={`stat-icon ${item.color}`}>
                    <Icon size={20} strokeWidth={1.8} />
                  </div>

                  <ArrowRight
                    size={15}
                    className="stat-arrow"
                  />
                </div>

                <strong className="stat-number">
                  {String(item.value).padStart(2, "0")}
                </strong>

                <span className="stat-label">
                  {item.title}
                </span>
              </button>
            );
          })}
        </div>

        {/* Main modules */}
        <div className="dashboard-section-heading">
          <h2>Management Modules</h2>
          <p>Select a module to manage your organization.</p>
        </div>

        <div className="module-cards">
          {modules.filter(item=>isSuper||(item.title==="Employees"?(permits("Employees")||permits("Attendance")):item.title==="Payroll"&&permits("Payroll"))).map((item) => {
            const Icon = item.icon;

            return (
              <button
                type="button"
                className="module-card"
                key={item.title}
                onClick={item.action}
              >
                <div className="module-icon">
                  <Icon size={23} strokeWidth={1.8} />
                </div>

                <h3>{item.title}</h3>

                <p className="module-description">
                  {item.description}
                </p>

                <div className="module-footer">
                  <span>Open module</span>
                  <ArrowRight size={17} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Admin workspace
  function renderAdmins() {
    return (
      <div className="hrms-workspace">
        <div className="workspace-heading">
          <h1>Admins</h1>
          <p>
            Manage administrators, roles and access permissions.
          </p>
        </div>

        <div className="workspace-tabs">
          {["Administrators", "Roles & Responsibilities", "Assign Employees"].map((tab) => (
            <button
              type="button"
              key={tab}
              className={adminTab === tab ? "active" : ""}
              onClick={() => setAdminTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {adminTab === "Administrators" && <AccountControls admins={admins} roles={roles} setAdmins={updateAdmins}/>}
        {adminTab === "Administrators" && (
          <AdminManagement
            roles={roles}
            admins={admins}
            setAdmins={updateAdmins}
            assignments={ownership}
            requests={accessRequests}
            today={getToday()}
            employees={employees}
            setEmployees={setEmployees}
          />
        )}

        {adminTab === "Assign Employees" && <EmployeeAccess admins={admins} employees={employees} assignments={ownership} setAssignments={setOwnership} requests={accessRequests} setRequests={setAccessRequests} today={getToday()}/>}
        {adminTab === "Roles & Responsibilities" && (
          <RoleManagement
            roles={roles}
            setRoles={setRoles}
            admins={admins}
          />
        )}
      </div>
    );
  }

  // Employee workspace
  function renderEmployees() {
    const tabs = [
      "Employee List",
      "Attendance",
      "Shifts",
      "Overtime",
    ].filter(tab=>isSuper||(tab==="Employee List"?permits("Employees"):tab!=="Shifts"&&permits("Attendance")));
    const tab=tabs.includes(employeeTab)?employeeTab:tabs[0];

    return (
      <div className="hrms-workspace">
        <div className="workspace-heading">
          <h1>Employees</h1>
          <p>
            Manage employee records, attendance and working hours.
          </p>
        </div>

        <div className="workspace-tabs">
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab}
              className={employeeTab === tab ? "active" : ""}
              onClick={() => { setCorrectionTarget(null); setEmployeeTab(tab); }}
            >
              {tab}
            </button>
          ))}
        </div>

        {tab === "Employee List" && (
          <EmployeeManagement
            employees={scoped(employees,"Employees","id")}
            setEmployees={writer(setEmployees,"Employees","id")}
            attendance={scoped(attendance,"Employees")}
            setAttendance={permits("Attendance")?writer(setAttendance,"Attendance"):()=>{}}
            shifts={shifts}
            shiftAssignments={scoped(shiftAssignments,"Employees")}
            onRequestCorrection={permits("Attendance")?requestCorrection:undefined}
          />
        )}

        {tab === "Attendance" && (
          <AttendanceManagement
            key={correctionTarget?.recordId || "attendance"}
            initialCorrectionTarget={correctionTarget}
            employees={scoped(employees,"Attendance","id")}
            attendance={scoped(attendance,"Attendance")}
            setAttendance={writer(setAttendance,"Attendance")}
            correctionRequests={scoped(correctionRequests,"Attendance")}
            setCorrectionRequests={writer(setCorrectionRequests,"Attendance")}
            shifts={shifts}
            shiftAssignments={scoped(shiftAssignments,"Attendance")}
            overtimeRequests={scoped(overtimeRequests,"Attendance")}
            setOvertimeRequests={writer(setOvertimeRequests,"Attendance")}
          />
        )}

        {tab === "Shifts" && (
          <ShiftManagement
            employees={employees}
            shifts={shifts}
            setShifts={setShifts}
            shiftAssignments={shiftAssignments}
            setShiftAssignments={setShiftAssignments}
            attendance={attendance}
          />
        )}

        {tab === "Overtime" && (
          <OvertimeManagement
            employees={scoped(employees,"Attendance","id")}
            attendance={scoped(attendance,"Attendance")}
            shifts={shifts}
            shiftAssignments={scoped(currentAssignments,"Attendance")}
            overtimeRequests={scoped(overtimeRequests,"Attendance")}
            setOvertimeRequests={writer(setOvertimeRequests,"Attendance")}
          />
        )}
      </div>
    );
  }

  // Display selected page
  function renderPage() {
    switch (activePage) {
      case "Dashboard":
        return renderDashboard();

      case "Admins":
        return isSuper?renderAdmins():renderDashboard();
      case "Access":
        return actor?<EmployeeAccess actor={actor} admins={admins} employees={employees} assignments={ownership} requests={accessRequests} setRequests={setAccessRequests} today={getToday()}/>:renderDashboard();

      case "Employees":
        return permits("Employees")||permits("Attendance")?renderEmployees():renderDashboard();

      case "Admins Payroll":
      case "Payroll":
        if(!permits("Payroll")||(activePage==="Admins Payroll"&&!isSuper))return renderDashboard();
        return (
          <PayrollManagement key={activePage} monthlyProps={{attendance:scoped(attendance,"Payroll"),shifts,assignments:scoped(shiftAssignments,"Payroll"),records:scoped(monthlyRecords,"Payroll"),setRecords:writer(setMonthlyRecords,"Payroll"),leaves:scoped(payrollLeaves,"Payroll"),setLeaves:writer(setPayrollLeaves,"Payroll"),ownership}}
            policies={payrollPolicies} setPolicies={setPayrollPolicies} isSuper={isSuper} actorId={actorId} admins={admins}
            adminPayroll={activePage==="Admins Payroll"}
            employees={payrollEmployees(scoped(employees,"Payroll","id"),admins,activePage==="Admins Payroll")}
            salaryRecords={scoped(salaryRecords,"Payroll")}
            setSalaryRecords={writer(setSalaryRecords,"Payroll")}
            salaryComponents={salaryComponents}
            setSalaryComponents={isSuper?setSalaryComponents:()=>{}}
            employeeLoans={scoped(employeeLoans,"Payroll")}
            setEmployeeLoans={writer(setEmployeeLoans,"Payroll")}
          />
        );

      default:
        return renderDashboard();
    }
  }

  if(!authenticated)return <AuthGate key="login" admins={admins} onLogin={changeActor}/>;
  if(readAccounts()[session.id]?.temporary)return <AuthGate key="change" admins={admins} changeId={session.id} onLogin={changeActor} onLogout={logout}/>;
  return (
    <div
      className={`app ${activePage === "Dashboard"
        ? "dashboard-view"
        : "module-view"
        }`}
    >
      {/* Header */}
      <header className="hrms-header">
        <button
          type="button"
          className="hrms-brand"
          onClick={() => navigate("Dashboard")}
          aria-label="Go to dashboard"
        >
          <div className="brand-icon">H</div>

          <div className="brand-text">
            <h2>HRMS</h2>
            <p>Management Portal</p>
          </div>
        </button>

        <div className="header-page-name">
          Human Resource Management System
        </div>

        <div className="header-right">
          <div className="header-avatar" aria-hidden="true">{initials}</div>
          <div className="header-user">
            <div className="header-account-control">
              <strong>{displayName}</strong>
            </div>
            <small>{displayRole}</small>
          </div>
          <button className="auth-logout" onClick={logout}>Sign out</button>
        </div>
      </header>

      {/* Main content */}
      <main className="main">
        <section className="content">
          {renderPage()}
        </section>
      </main>

      {/* Bottom navigation */}
      <nav
        className="bottom-nav"
        aria-label="Main navigation"
      >
        {[...menuItems,...(!isSuper?[{icon:ShieldCheck,name:"Access"}]:[])].filter(item=>isSuper||item.name==="Dashboard"||item.name==="Access"||(item.name==="Employees"&&(permits("Employees")||permits("Attendance")))||(item.name==="Payroll"&&permits("Payroll"))).map((item) => {
          const Icon = item.icon;

          return (
            <button
              type="button"
              key={item.name}
              className={
                activePage === item.name
                  ? "bottom-nav-item active"
                  : "bottom-nav-item"
              }
              aria-current={
                activePage === item.name ? "page" : undefined
              }
              onClick={() => navigate(item.name)}
            >
              <Icon
                size={18}
                strokeWidth={1.8}
                aria-hidden="true"
              />

              <span className="bottom-nav-label">
                {item.name}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default App;
