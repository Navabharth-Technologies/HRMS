
import { useState } from "react";
import "./RoleManagement.css";

const modules = [
  "Admin Management",
  "Roles & Permissions",
  "Employees",
  "Attendance",
  "Payroll",
];

function RoleManagement({ roles, setRoles, admins }) {
  const [showForm, setShowForm] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [selectedModules, setSelectedModules] = useState([]);
  const [error, setError] = useState("");

  function toggleModule(moduleName) {
    if (selectedModules.includes(moduleName)) {
      setSelectedModules(
        selectedModules.filter((item) => item !== moduleName)
      );
    } else {
      setSelectedModules([...selectedModules, moduleName]);
    }

    setError("");
  }

  function handleSubmit(event) {
    event.preventDefault();

    const name = roleName.trim();

    if (!name) {
      setError("Please enter a role name.");
      return;
    }

    if (selectedModules.length === 0) {
      setError("Select at least one module.");
      return;
    }

    const alreadyExists = roles.some(
      (role) => role.name.toLowerCase() === name.toLowerCase()
    );

    if (alreadyExists) {
      setError("A role with this name already exists.");
      return;
    }

    const newRole = {
      id: crypto.randomUUID(),
      name: name,
      permissions: [...selectedModules],
    };

    setRoles((currentRoles) => [...currentRoles, newRole]);

    setRoleName("");
    setSelectedModules([]);
    setError("");
    setShowForm(false);
  }

  function getAssignedCount(roleId) {
    return admins.filter(
      (admin) => String(admin.roleId) === String(roleId)
    ).length;
  }

  function deleteRole(id) {
    const assignedCount = getAssignedCount(id);

    if (assignedCount > 0) {
      window.alert(
        `Cannot delete this role. It is assigned to ${assignedCount} administrator(s).`
      );
      return;
    }

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this role?"
    );

    if (!confirmDelete) {
      return;
    }

    setRoles((currentRoles) =>
      currentRoles.filter((role) => role.id !== id)
    );
  }

  function toggleForm() {
    setShowForm(!showForm);
    setRoleName("");
    setSelectedModules([]);
    setError("");
  }

  return (
    <div className="role-page">
      <div className="role-page-heading">
        <div>
          <h1>Roles & Permissions</h1>
          <p>Create administrator roles and configure module access.</p>
        </div>

        <button className="primary-btn" onClick={toggleForm}>
          {showForm ? "Cancel" : "+ Create Role"}
        </button>
      </div>

      {showForm && (
        <div className="role-form-card">
          <h3>Create New Role</h3>
          <p>Choose a name and select the modules this role can access.</p>

          <form onSubmit={handleSubmit}>
            <div className="role-field">
              <label htmlFor="role-name">Role Name</label>
              <input
                id="role-name"
                type="text"
                value={roleName}
                onChange={(event) => {
                  setRoleName(event.target.value);
                  setError("");
                }}
                placeholder="Example: HR Manager"
              />
            </div>

            <div className="permission-section">
              <h4>Module Permissions</h4>
              <p>Select the modules available to this role.</p>

              <div className="permission-grid">
                {modules.map((moduleName) => (
                  <label className="permission-option" key={moduleName}>
                    <input
                      type="checkbox"
                      checked={selectedModules.includes(moduleName)}
                      onChange={() => toggleModule(moduleName)}
                    />
                    <span>{moduleName}</span>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <p className="role-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="primary-btn">
              Save Role
            </button>
          </form>
        </div>
      )}

      <div className="role-list-card">
        <div className="role-list-header">
          <div>
            <h3>Existing Roles</h3>
            <p>{roles.length} roles configured</p>
          </div>
        </div>

        {roles.length === 0 && (
          <p className="role-empty">No roles have been created.</p>
        )}

        {roles.map((role) => (
          <div className="role-item" key={role.id}>
            <div className="role-details">
              <h4>{role.name}</h4>

              <p className="role-assigned-count">
                {getAssignedCount(role.id)} administrator(s) assigned
              </p>

              <div className="role-permissions">
                {role.permissions.map((permission) => (
                  <span className="permission-badge" key={permission}>
                    {permission}
                  </span>
                ))}
              </div>
            </div>

            <button
              className="delete-role-btn"
              onClick={() => deleteRole(role.id)}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RoleManagement;
