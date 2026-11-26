
import { useState } from "react";
import {
  UserPlus,
  Search,
  UserCheck,
  UserX,
  X,
  CheckCircle2,
  AlertCircle,
  Users,
  ShieldCheck,
} from "lucide-react";

import "./AdminManagement.css";
import {ownerOf} from "./adminAccess.js";

const emptyForm = {
  name: "",
  email: "",
  role: "",
};

function AdminManagement({ roles, admins, setAdmins, employees, setEmployees, assignments=[], requests=[], today }) {
  const [profileId,setProfileId]=useState(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  }

  function handleSubmit(event) {
    event.preventDefault();

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const roleId = form.role;

    if (!name || !email || !roleId) {
      setError("Please fill in all fields.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    const emailExists = admins.some(
      (admin) => admin.email.toLowerCase() === email
    );

    if (emailExists) {
      setError("An administrator with this email already exists.");
      return;
    }

    const selectedRole = roles.find(
      (role) => String(role.id) === String(roleId)
    );

    if (!selectedRole) {
      setError("Please select a valid role.");
      return;
    }

    const existing=employees.find(e=>e.email.toLowerCase()===email);
    if(existing&&(existing.status!=="Active"||admins.some(a=>a.employeeId===existing.id))){setError("Employee is inactive or already linked.");return;}
    const employeeId=existing?.id||"EMP"+crypto.randomUUID();
    if(!existing){if(!window.confirm("Create an employee profile for this administrator?"))return;setEmployees(old=>[...old,{id:employeeId,name,email,phone:"",department:"Human Resources",designation:"Administrator",joiningDate:new Date().toLocaleDateString("en-CA"),status:"Active",bank:{},documents:[]}]);}
    const newAdmin = {
      employeeId,
      id: crypto.randomUUID(),
      name,
      email,
      roleId: String(selectedRole.id),
      status: "Active",
    };

    setAdmins((currentAdmins) => [
      ...currentAdmins,
      newAdmin,
    ]);

    setForm(emptyForm);
    setError("");
    setSearch("");
    setShowForm(false);

    setSuccess(`${name} has been added successfully.`);
  }

  function linkProfile(admin){const existing=employees.find(e=>e.email.toLowerCase()===admin.email.toLowerCase());if(existing&&admins.some(a=>a.id!==admin.id&&a.employeeId===existing.id)){setError("Employee already linked.");return;}const id=existing?.id||"EMP"+crypto.randomUUID();if(!existing){if(!window.confirm("Create employee profile?"))return;setEmployees(old=>[...old,{id,name:admin.name,email:admin.email,phone:"",department:"Human Resources",designation:"Administrator",joiningDate:new Date().toLocaleDateString("en-CA"),status:"Active",bank:{},documents:[]}]);}setAdmins(old=>old.map(a=>a.id===admin.id?{...a,employeeId:id}:a));}
  function toggleStatus(admin) {
    const newStatus =
      admin.status === "Active" ? "Inactive" : "Active";

    if (newStatus === "Inactive") {
      const confirmed = window.confirm(
        `Are you sure you want to deactivate ${admin.name}?`
      );

      if (!confirmed) return;
    }

    setAdmins((currentAdmins) =>
      currentAdmins.map((item) =>
        item.id === admin.id
          ? { ...item, status: newStatus }
          : item
      )
    );

    setSuccess(
      `${admin.name} has been ${
        newStatus === "Active" ? "activated" : "deactivated"
      } successfully.`
    );
  }

  function getRoleName(roleId) {
    const role = roles.find(
      (item) => String(item.id) === String(roleId)
    );

    return role ? role.name : "Unassigned";
  }

  function getInitials(name) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase();
  }

  function toggleForm() {
    setShowForm((previous) => !previous);
    setForm(emptyForm);
    setError("");
    setSuccess("");
  }

  const keyword = search.trim().toLowerCase();

  const filteredAdmins = admins.filter((admin) => {
    const roleName = getRoleName(admin.roleId);

    return (
      admin.name.toLowerCase().includes(keyword) ||
      admin.email.toLowerCase().includes(keyword) ||
      roleName.toLowerCase().includes(keyword)
    );
  });

  const activeCount = admins.filter(
    (admin) => admin.status === "Active"
  ).length;

  const inactiveCount = admins.length - activeCount;

  const profile=admins.find(a=>a.id===profileId);
  if(profile){const employee=employees.find(e=>e.id===profile.employeeId);const assigned=employees.filter(e=>ownerOf(e.id,assignments,today)===profile.id);return <div className="admin-page"><div><button className="admin-secondary-btn" onClick={()=>setProfileId(null)}>← Back to Administrators</button></div><div className="admin-table-card"><h3>{profile.name}</h3><p>{profile.email} · {getRoleName(profile.roleId)} · {profile.status}</p><p>Employee ID: {employee?.id||'Not linked'} · {employee?.department||'—'} · {employee?.designation||'—'}</p><p>Responsibilities: {roles.find(r=>String(r.id)===String(profile.roleId))?.permissions?.join(', ')||'None'}</p></div><div className="admin-table-card"><h3>Assigned Employees ({assigned.length})</h3><div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Employee</th><th>Department</th><th>Designation</th></tr></thead><tbody>{assigned.map(e=><tr key={e.id}><td>{e.name} · {e.id}</td><td>{e.department}</td><td>{e.designation}</td></tr>)}{!assigned.length&&<tr><td colSpan="3">No employees assigned.</td></tr>}</tbody></table></div></div><div className="admin-table-card"><h3>Assignment History</h3><div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Employee</th><th>Effective date</th><th>Reason</th><th>Status</th></tr></thead><tbody>{assignments.filter(a=>a.adminId===profile.id).map(a=><tr key={a.id}><td>{employees.find(e=>e.id===a.employeeId)?.name||a.employeeId}</td><td>{a.effectiveFrom}</td><td>{a.reason}</td><td>{a.effectiveFrom>today?'Upcoming':assignments.some(b=>b.employeeId===a.employeeId&&b.effectiveFrom>a.effectiveFrom&&b.effectiveFrom<=today)?'Previous':'Current'}</td></tr>)}</tbody></table></div></div><div className="admin-table-card"><h3>Temporary Coverage</h3>{requests.filter(r=>r.adminId===profile.id&&r.kind==='Temporary'&&r.status==='Approved'&&r.start<=today&&r.end>=today).map(r=><p key={r.id}>{employees.find(e=>e.id===r.employeeId)?.name||r.employeeId} · {r.start} – {r.end}</p>)}</div></div>}
  return (
    <div className="admin-page">

      {/* Success message */}
      {success && (
        <div className="admin-success" role="status">
          <CheckCircle2 size={18} />

          <span>{success}</span>

          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Dismiss message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {!showForm&&error&&<div className="admin-error" role="alert">{error}</div>}
      {/* Add administrator form */}
      {showForm && (
        <div className="admin-form-card">
          <div className="admin-form-heading">
            <div className="admin-heading-group">
              <div className="admin-heading-icon">
                <UserPlus size={20} />
              </div>

              <div>
                <h3>Add Administrator</h3>
                <p>
                  Enter administrator details and assign a role.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="admin-close-btn"
              onClick={toggleForm}
              aria-label="Close form"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="admin-form-grid">
              <div className="admin-field">
                <label htmlFor="admin-name">
                  Full Name
                </label>

                <input
                  id="admin-name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter full name"
                  autoComplete="name"
                  autoFocus
                />
              </div>

              <div className="admin-field">
                <label htmlFor="admin-email">
                  Email Address
                </label>

                <input
                  id="admin-email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Enter email address"
                  autoComplete="email"
                />
              </div>

              <div className="admin-field">
                <label htmlFor="admin-role">
                  Assign Role
                </label>

                <select
                  id="admin-role"
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                >
                  <option value="">Select a role</option>

                  {roles.map((role) => (
                    <option
                      key={role.id}
                      value={String(role.id)}
                    >
                      {role.name}
                    </option>
                  ))}
                </select>

                {roles.length === 0 && (
                  <small>
                    Create a role before adding an administrator.
                  </small>
                )}
              </div>
            </div>

            {error && (
              <div className="admin-error" role="alert">
                <AlertCircle size={17} />
                <span>{error}</span>
              </div>
            )}

            <div className="admin-form-actions">
              <button
                type="button"
                className="admin-secondary-btn"
                onClick={toggleForm}
              >
                Cancel
              </button>

              <button
                className="admin-primary-btn"
                type="submit"
              >
                <UserPlus size={16} />
                Save Administrator
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Administrators table */}
      <div className="admin-table-card">
        <div className="admin-table-heading">
          <div className="admin-heading-group">
            <div className="admin-heading-icon">
              <Users size={21} />
            </div>

            <div>
              <h3>Administrators</h3>

              <p>
                {admins.length} total · {activeCount} active ·{" "}
                {inactiveCount} inactive
              </p>
            </div>
          </div>

          <button
            type="button"
            className="admin-primary-btn"
            onClick={toggleForm}
          >
            {showForm ? (
              <X size={17} />
            ) : (
              <UserPlus size={17} />
            )}

            {showForm ? "Cancel" : "Add Admin"}
          </button>
        </div>

        <div className="admin-toolbar">
          <div className="admin-search-wrapper">
            <Search size={17} />

            <input
              className="admin-search"
              type="text"
              placeholder="Search by name, email or role..."
              aria-label="Search administrators"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />

            {search && (
              <button
                type="button"
                className="admin-clear-search"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <span className="admin-result-count">
            Showing {filteredAdmins.length} of {admins.length}
          </span>
        </div>

        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Administrator</th>
                <th scope="col">Email Address</th>
                <th scope="col">Assigned Role</th><th>Employee Profile</th>
                <th scope="col">Status</th>
                <th scope="col">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredAdmins.map((admin) => (
                <tr key={admin.id}>
                  <td>
                    <div className="admin-person">
                      <div className="admin-avatar">
                        {getInitials(admin.name)}
                      </div>

                      <button className="admin-name admin-profile-link" onClick={()=>setProfileId(admin.id)}>{admin.name}</button>
                    </div>
                  </td>

                  <td className="admin-email">
                    {admin.email}
                  </td>

                  <td>
                    <span className="admin-role-tag">
                      <ShieldCheck size={14} />
                      {getRoleName(admin.roleId)}
                    </span>
                  </td>

                  <td>{admin.employeeId||<button className="admin-secondary-btn" onClick={()=>linkProfile(admin)}>Link Profile</button>}</td>
                  <td>
                    <span
                      className={`admin-status ${
                        admin.status === "Active"
                          ? "active"
                          : "inactive"
                      }`}
                    >
                      <span className="admin-status-dot" />
                      {admin.status}
                    </span>
                  </td>

                  <td>
                    <button
                      type="button"
                      className={`admin-status-btn ${
                        admin.status === "Active"
                          ? "deactivate"
                          : "activate"
                      }`}
                      onClick={() => toggleStatus(admin)}
                    >
                      {admin.status === "Active" ? (
                        <UserX size={15} />
                      ) : (
                        <UserCheck size={15} />
                      )}

                      {admin.status === "Active"
                        ? "Deactivate"
                        : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}

              {filteredAdmins.length === 0 && (
                <tr>
                  <td colSpan="6">
                    <div className="admin-empty">
                      <div className="admin-empty-icon">
                        {search ? (
                          <Search size={25} />
                        ) : (
                          <Users size={25} />
                        )}
                      </div>

                      <h4>
                        {search
                          ? "No matching administrators"
                          : "No administrators yet"}
                      </h4>

                      <p>
                        {search
                          ? "Try searching with a different name, email or role."
                          : "Add your first administrator to get started."}
                      </p>

                      {search && (
                        <button
                          type="button"
                          className="admin-secondary-btn"
                          onClick={() => setSearch("")}
                        >
                          Clear Search
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminManagement;
