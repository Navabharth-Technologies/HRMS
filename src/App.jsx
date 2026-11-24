
import { useState } from "react";
import AdminManagement from "./pages/AdminManagement";
import RoleManagement from "./pages/RoleManagement";
import EmployeeManagement from "./pages/EmployeeManagement";
import AttendanceManagement from "./pages/AttendanceManagement";
import ShiftManagement from "./pages/ShiftManagement";
import OvertimeManagement from "./pages/OvertimeManagement";
import PayrollManagement from "./pages/PayrollManagement";
import "./App.css";

const menuItems = [
  { icon: "▦", name: "Dashboard" },
  { icon: "♙", name: "Admin Management" },
  { icon: "⚙", name: "Roles & Permissions" },
  { icon: "♧", name: "Employees" },
  { icon: "◷", name: "Attendance" },
  { icon: "▤", name: "Shift Management" },
  { icon: "◴", name: "Overtime" },
  { icon: "▤", name: "Payroll" },
];

const activities = [
  {
    name: "Employee record updated",
    by: "HR Admin",
    time: "10:30 AM",
  },
  {
    name: "Attendance correction requested",
    by: "Attendance Admin",
    time: "09:45 AM",
  },
  {
    name: "New administrator added",
    by: "Super Admin",
    time: "Yesterday",
  },
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

function App() {
  const [activePage, setActivePage] = useState("Dashboard");

  const [roles, setRoles] = useState(initialRoles);
  const [admins, setAdmins] = useState(initialAdmins);
  const [employees, setEmployees] = useState(initialEmployees);

  const [attendance, setAttendance] = useState([]);
  const [correctionRequests, setCorrectionRequests] =
    useState([]);

  const [shifts, setShifts] = useState([]);
  const [shiftAssignments, setShiftAssignments] =
    useState([]);

  const [overtimeRequests, setOvertimeRequests] =
    useState([]);

  const [salaryRecords, setSalaryRecords] = useState([]);

  const [salaryComponents, setSalaryComponents] = useState([
    { id: "basic", name: "Basic Salary", type: "Earning" },
    { id: "hra", name: "HRA", type: "Earning" },
    { id: "allowance", name: "Other Allowance", type: "Earning" },
  ]);
  const [employeeLoans, setEmployeeLoans] = useState([]);

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

  const stats = [
    {
      title: "Total Employees",
      value: String(employees.length).padStart(2, "0"),
      detail: "Registered employees",
    },
    {
      title: "Active Admins",
      value: String(activeAdmins).padStart(2, "0"),
      detail: "System administrators",
    },
    {
      title: "Present Today",
      value: String(presentToday).padStart(2, "0"),
      detail: "Attendance recorded today",
    },
    {
      title: "Pending OT",
      value: String(pendingOvertime).padStart(2, "0"),
      detail: "Overtime awaiting approval",
    },
  ];

  function renderDashboard() {
    return (
      <>
        <div className="welcome">
          <div>
            <h1>Good to have you here.</h1>
            <p>
              Here's an overview of your HR management system.
            </p>
          </div>

          <span className="demo-tag">Demo Data</span>
        </div>

        <div className="cards">
          {stats.map((item) => (
            <div className="card" key={item.title}>
              <p className="stat-title">{item.title}</p>
              <h2>{item.value}</h2>
              <span className="stat-detail">
                {item.detail}
              </span>
            </div>
          ))}
        </div>

        <div className="dashboard-grid">
          <div className="panel">
            <div className="panel-heading">
              <h3>Quick Actions</h3>
              <p>Frequently used management tasks</p>
            </div>

            <div className="action-list">
              <button
                onClick={() =>
                  setActivePage("Admin Management")
                }
              >
                <span>+ Add Administrator</span>
                <span>→</span>
              </button>

              <button
                onClick={() => setActivePage("Employees")}
              >
                <span>+ Add Employee</span>
                <span>→</span>
              </button>

              <button
                onClick={() =>
                  setActivePage("Biometric Attendance")
                }
              >
                <span>Import Biometric Attendance</span>
                <span>→</span>
              </button>

              <button
                onClick={() => setActivePage("Overtime")}
              >
                <span>Review Overtime</span>
                <span>→</span>
              </button>
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <h3>Recent Activity</h3>
              <p>Latest updates in the system</p>
            </div>

            <div className="activity-list">
              {activities.map((activity, index) => (
                <div className="activity" key={index}>
                  <span className="activity-dot"></span>

                  <div>
                    <strong>{activity.name}</strong>
                    <p>
                      {activity.by} · {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  function renderPage() {
    switch (activePage) {
      case "Dashboard":
        return renderDashboard();

      case "Admin Management":
        return (
          <AdminManagement
            roles={roles}
            admins={admins}
            setAdmins={setAdmins}
          />
        );

      case "Roles & Permissions":
        return (
          <RoleManagement
            roles={roles}
            setRoles={setRoles}
            admins={admins}
          />
        );

      case "Employees":
        return (
          <EmployeeManagement
            employees={employees}
            setEmployees={setEmployees}
          />
        );

      case "Attendance":
        return (
          <AttendanceManagement
            employees={employees}
            attendance={attendance}
            setAttendance={setAttendance}
            correctionRequests={correctionRequests}
            setCorrectionRequests={setCorrectionRequests}
            shifts={shifts}
            shiftAssignments={shiftAssignments}
            overtimeRequests={overtimeRequests}
            setOvertimeRequests={setOvertimeRequests}
          />
        );
      case "Biometric Attendance":
        return (
          <BiometricAttendance
            employees={employees}
            attendance={attendance}
            setAttendance={setAttendance}
            shifts={shifts}
            shiftAssignments={shiftAssignments}
            overtimeRequests={overtimeRequests}
            setOvertimeRequests={setOvertimeRequests}
          />
        );

      case "Shift Management":
        return (
          <ShiftManagement
            employees={employees}
            shifts={shifts}
            setShifts={setShifts}
            shiftAssignments={shiftAssignments}
            setShiftAssignments={setShiftAssignments}
            attendance={attendance}
          />
        );

      case "Overtime":
        return (
          <OvertimeManagement
            employees={employees}
            attendance={attendance}
            shifts={shifts}
            shiftAssignments={shiftAssignments}
            overtimeRequests={overtimeRequests}
            setOvertimeRequests={setOvertimeRequests}
          />
        );

      case "Payroll":
        return (
          <PayrollManagement
            employees={employees}
            salaryRecords={salaryRecords}
            setSalaryRecords={setSalaryRecords}
            salaryComponents={salaryComponents}
            setSalaryComponents={setSalaryComponents}
            employeeLoans={employeeLoans}
            setEmployeeLoans={setEmployeeLoans}
          />
        );

      default:
        return (
          <div className="panel empty-page">
            <h3>{activePage}</h3>
            <p>
              This module will be developed in the next phase.
            </p>
          </div>
        );
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">H</div>

          <div>
            <h2>HRMS</h2>
            <p>Management Portal</p>
          </div>
        </div>

        <p className="menu-label">WORKSPACE</p>

        <nav className="nav">
          {menuItems.map((item) => (
            <button
              key={item.name}
              className={
                activePage === item.name
                  ? "nav-item active"
                  : "nav-item"
              }
              onClick={() => setActivePage(item.name)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.name}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="avatar">SA</div>

          <div>
            <strong>Super Admin</strong>
            <small>System Administrator</small>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="header">
          <div>
            <p className="breadcrumb">
              Workspace / {activePage}
            </p>
            <h2>{activePage}</h2>
          </div>

          <div className="header-right">
            <span className="role-tag">
              Super Admin
            </span>
            <div className="header-avatar">SA</div>
          </div>
        </header>

        <section className="content">
          {renderPage()}
        </section>
      </main>
    </div>
  );
}

export default App;
