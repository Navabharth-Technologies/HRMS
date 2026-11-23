
import { useState } from "react";
import "./AdminManagement.css";

function AdminManagement({ roles, admins, setAdmins }) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "",
  });
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm({
      ...form,
      [name]: value,
    });

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

    const newAdmin = {
      id: crypto.randomUUID(),
      name: name,
      email: email,
      roleId: String(selectedRole.id),
      status: "Active",
    };

    setAdmins((currentAdmins) => [...currentAdmins, newAdmin]);

    setForm({
      name: "",
      email: "",
      role: "",
    });

    setError("");
    setShowForm(false);
  }

  function toggleStatus(id) {
    setAdmins((currentAdmins) =>
      currentAdmins.map((admin) => {
        if (admin.id === id) {
          return {
            ...admin,
            status: admin.status === "Active" ? "Inactive" : "Active",
          };
        }

        return admin;
      })
    );
  }

  function getRoleName(roleId) {
    const role = roles.find(
      (item) => String(item.id) === String(roleId)
    );

    return role ? role.name : "Unassigned";
  }

  function toggleForm() {
    setShowForm(!showForm);
    setForm({ name: "", email: "", role: "" });
    setError("");
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

  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <h1>Admin Management</h1>
          <p>Manage administrators and assign their roles.</p>
        </div>

        <button className="admin-primary-btn" onClick={toggleForm}>
          {showForm ? "Cancel" : "+ Add Admin"}
        </button>
      </div>

      {showForm && (
        <div className="admin-form-card">
          <h3>Add New Administrator</h3>
          <p>Enter administrator details and assign a role.</p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="admin-form-grid">
              <div className="admin-field">
                <label htmlFor="admin-name">Full Name</label>
                <input
                  id="admin-name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter full name"
                />
              </div>

              <div className="admin-field">
                <label htmlFor="admin-email">Email Address</label>
                <input
                  id="admin-email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Enter email address"
                />
              </div>

              <div className="admin-field">
                <label htmlFor="admin-role">Assign Role</label>
                <select
                  id="admin-role"
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                >
                  <option value="">Select a role</option>

                  {roles.map((role) => (
                    <option key={role.id} value={String(role.id)}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <p className="admin-error" role="alert">
                {error}
              </p>
            )}

            <button className="admin-primary-btn" type="submit">
              Save Administrator
            </button>
          </form>
        </div>
      )}

      <div className="admin-table-card">
        <div className="admin-table-heading">
          <div>
            <h3>Administrators</h3>
            <p>{admins.length} administrator(s) registered</p>
          </div>

          <input
            className="admin-search"
            type="text"
            placeholder="Search administrators..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredAdmins.map((admin) => (
                <tr key={admin.id}>
                  <td className="admin-name">{admin.name}</td>
                  <td>{admin.email}</td>
                  <td>{getRoleName(admin.roleId)}</td>
                  <td>
                    <span
                      className={
                        admin.status === "Active"
                          ? "admin-status active"
                          : "admin-status inactive"
                      }
                    >
                      {admin.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="status-btn"
                      onClick={() => toggleStatus(admin.id)}
                    >
                      {admin.status === "Active"
                        ? "Deactivate"
                        : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}

              {filteredAdmins.length === 0 && (
                <tr>
                  <td colSpan="5" className="admin-empty">
                    No administrators found.
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
