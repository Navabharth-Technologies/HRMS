
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

import "./App.css";

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

function App() {
  // Navigation
  const [activePage, setActivePage] = useState("Dashboard");

  const [adminTab, setAdminTab] = useState("Administrators");
  const [employeeTab, setEmployeeTab] = useState("Employee List");

  // Admin and employee data
  const [roles, setRoles] = useState(initialRoles);
  const [admins, setAdmins] = useState(initialAdmins);
  const [employees, setEmployees] = useState(initialEmployees);

  // Attendance
  const [attendance, setAttendance] = useState([]);
  const [correctionRequests, setCorrectionRequests] = useState([]);

  // Shifts
  const [shifts, setShifts] = useState([]);
  const [shiftAssignments, setShiftAssignments] = useState([]);

  // Overtime
  const [overtimeRequests, setOvertimeRequests] = useState([]);

  // Payroll
  const [salaryRecords, setSalaryRecords] = useState([]);

  const [salaryComponents, setSalaryComponents] = useState([
    { id: "basic", name: "Basic Salary", type: "Earning" },
    { id: "hra", name: "HRA", type: "Earning" },
    { id: "allowance", name: "Other Allowance", type: "Earning" },
  ]);

  // Employee loans
  const [employeeLoans, setEmployeeLoans] = useState([]);

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

  // Dashboard
  function renderDashboard() {
    const stats = [
      {
        title: "Total Employees",
        value: employees.length,
        icon: Users,
        color: "indigo",
        action: () => openEmployeeTab("Employee List"),
      },
      {
        title: "Present Today",
        value: presentToday,
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
        value: pendingOvertime,
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
        title: "Payroll",
        icon: Wallet,
        description:
          "Manage salary structures and employee loans.",
        action: () => navigate("Payroll"),
      },
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
          </div>
        </div>

        {/* Statistics cards */}
        <div className="dashboard-stats">
          {stats.map((item) => {
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
          {modules.map((item) => {
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
          {["Administrators", "Roles & Permissions"].map((tab) => (
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

        {adminTab === "Administrators" && (
          <AdminManagement
            roles={roles}
            admins={admins}
            setAdmins={setAdmins}
          />
        )}

        {adminTab === "Roles & Permissions" && (
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
    ];

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
              onClick={() => setEmployeeTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {employeeTab === "Employee List" && (
          <EmployeeManagement
            employees={employees}
            setEmployees={setEmployees}
            attendance={attendance}
            shifts={shifts}
            shiftAssignments={shiftAssignments}
            overtimeRequests={overtimeRequests}
          />
        )}

        {employeeTab === "Attendance" && (
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
        )}

        {employeeTab === "Shifts" && (
          <ShiftManagement
            employees={employees}
            shifts={shifts}
            setShifts={setShifts}
            shiftAssignments={shiftAssignments}
            setShiftAssignments={setShiftAssignments}
            attendance={attendance}
          />
        )}

        {employeeTab === "Overtime" && (
          <OvertimeManagement
            employees={employees}
            attendance={attendance}
            shifts={shifts}
            shiftAssignments={shiftAssignments}
            overtimeRequests={overtimeRequests}
            setOvertimeRequests={setOvertimeRequests}
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
        return renderAdmins();

      case "Employees":
        return renderEmployees();

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
        return renderDashboard();
    }
  }

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
          <div className="header-user">
            <strong>Super Admin</strong>
            <small>System Administrator</small>
          </div>

          <div className="header-avatar">SA</div>
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
        {menuItems.map((item) => {
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
