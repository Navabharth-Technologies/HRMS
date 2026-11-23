
import { useState } from "react";
import AdminManagement from "./pages/AdminManagement";
import RoleManagement from "./pages/RoleManagement";
import EmployeeManagement from "./pages/EmployeeManagement";
import "./App.css";

const menuItems = [
  { icon: "▦", name: "Dashboard" },
  { icon: "♙", name: "Admin Management" },
  { icon: "⚙", name: "Roles & Permissions" },
  { icon: "♧", name: "Employees" },
  { icon: "◷", name: "Attendance" },
  { icon: "▤", name: "Payroll" },
];

const stats = [
  { title: "Total Employees", value: "120", detail: "Registered employees" },
  { title: "Active Admins", value: "05", detail: "System administrators" },
  { title: "Present Today", value: "98", detail: "Attendance recorded" },
  { title: "Pending Payroll", value: "12", detail: "Records to review" },
];

const activities = [
  { name: "Employee record updated", by: "HR Admin", time: "10:30 AM" },
  { name: "Attendance correction requested", by: "Attendance Admin", time: "09:45 AM" },
  { name: "New administrator added", by: "Super Admin", time: "Yesterday" },
];

const initialRoles = [
  { id: "1", name: "HR Admin", permissions: ["Employees", "Attendance"] },
  { id: "2", name: "Attendance Admin", permissions: ["Attendance"] },
  { id: "3", name: "Payroll Admin", permissions: ["Payroll"] },
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

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [roles, setRoles] = useState(initialRoles);
  const [admins, setAdmins] = useState(initialAdmins);

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
            <p className="breadcrumb">Workspace / {activePage}</p>
            <h2>{activePage}</h2>
          </div>

          <div className="header-right">
            <span className="role-tag">Super Admin</span>
            <div className="header-avatar">SA</div>
          </div>
        </header>

        <section className="content">
          {activePage === "Dashboard" ? (
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
                    <span className="stat-detail">{item.detail}</span>
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
                      onClick={() => setActivePage("Admin Management")}
                    >
                      <span>+ Add Administrator</span>
                      <span>→</span>
                    </button>

                    <button onClick={() => setActivePage("Employees")}>
                      <span>+ Add Employee</span>
                      <span>→</span>
                    </button>

                    <button onClick={() => setActivePage("Attendance")}>
                      <span>Review Attendance</span>
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
          ) : activePage === "Admin Management" ? (
            <AdminManagement
              roles={roles}
              admins={admins}
              setAdmins={setAdmins}
            />
          ) : activePage === "Roles & Permissions" ? (
            <RoleManagement
              roles={roles}
              setRoles={setRoles}
              admins={admins}
            />
          ) : activePage === "Employees" ? (
            <EmployeeManagement />
          ) : (
            <div className="panel empty-page">
              <h3>{activePage}</h3>
              <p>This module will be developed in the next phase.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
