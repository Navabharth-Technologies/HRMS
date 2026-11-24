
import { useState } from "react";
import {
  ShieldCheck,
  ShieldPlus,
  Trash2,
  Users,
  X,
  Search,
  LockKeyhole,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import "./RoleManagement.css";

const modules = [
  {
    name: "Admin Management",
    description: "Manage administrator records.",
  },
  {
    name: "Roles & Permissions",
    description: "Configure roles and module permissions.",
  },
  {
    name: "Employees",
    description: "Manage employee records.",
  },
  {
    name: "Attendance",
    description: "Manage employee attendance.",
  },
  {
    name: "Payroll",
    description: "Manage salaries and payroll records.",
  },
];

function RoleManagement({ roles, setRoles, admins }) {
  const [showForm, setShowForm] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [selectedModules, setSelectedModules] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function toggleModule(moduleName) {
    setSelectedModules((previous) =>
      previous.includes(moduleName)
        ? previous.filter((item) => item !== moduleName)
        : [...previous, moduleName]
    );

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
      (role) =>
        role.name.toLowerCase() === name.toLowerCase()
    );

    if (alreadyExists) {
      setError("A role with this name already exists.");
      return;
    }

    const newRole = {
      id: crypto.randomUUID(),
      name,
      permissions: [...selectedModules],
    };

    setRoles((currentRoles) => [
      ...currentRoles,
      newRole,
    ]);

    setRoleName("");
    setSelectedModules([]);
    setError("");
    setSearch("");
    setShowForm(false);

    setSuccess(`${name} has been created successfully.`);
  }

  function getAssignedCount(roleId) {
    return admins.filter(
      (admin) =>
        String(admin.roleId) === String(roleId)
    ).length;
  }

  function deleteRole(role) {
    const assignedCount = getAssignedCount(role.id);

    if (assignedCount > 0) {
      window.alert(
        `Cannot delete ${role.name}. This role is assigned to ${assignedCount} administrator(s).`
      );

      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete ${role.name}?`
    );

    if (!confirmed) return;

    setRoles((currentRoles) =>
      currentRoles.filter(
        (item) => item.id !== role.id
      )
    );

    setSuccess(`${role.name} has been deleted.`);
  }

  function toggleForm() {
    setShowForm((previous) => !previous);
    setRoleName("");
    setSelectedModules([]);
    setError("");
    setSuccess("");
  }

  const keyword = search.trim().toLowerCase();

  const filteredRoles = roles.filter(
    (role) =>
      role.name.toLowerCase().includes(keyword) ||
      role.permissions.some((permission) =>
        permission.toLowerCase().includes(keyword)
      )
  );

  return (
    <div className="role-page">

      {/* Success message */}
      {success && (
        <div className="role-success" role="status">
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

      {/* Create role form */}
      {showForm && (
        <div className="role-form-card">
          <div className="role-form-heading">
            <div className="role-heading-group">
              <div className="role-heading-icon">
                <ShieldPlus size={21} />
              </div>

              <div>
                <h3>Create Role</h3>

                <p>
                  Define a role and select its module permissions.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="role-close-btn"
              onClick={toggleForm}
              aria-label="Close form"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="role-field">
              <label htmlFor="role-name">
                Role Name
              </label>

              <input
                id="role-name"
                type="text"
                value={roleName}
                onChange={(event) => {
                  setRoleName(event.target.value);
                  setError("");
                }}
                placeholder="Example: HR Manager"
                autoFocus
              />
            </div>

            <div className="role-permission-section">
              <div className="role-permission-heading">
                <div>
                  <h4>Module Permissions</h4>

                  <p>
                    Choose which modules this role can access.
                  </p>
                </div>

                <span className="role-selected-count">
                  {selectedModules.length} selected
                </span>
              </div>

              <div className="role-permission-grid">
                {modules.map((module) => (
                  <label
                    key={module.name}
                    className={`role-permission-option ${
                      selectedModules.includes(module.name)
                        ? "selected"
                        : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedModules.includes(
                        module.name
                      )}
                      onChange={() =>
                        toggleModule(module.name)
                      }
                    />

                    <div>
                      <strong>{module.name}</strong>
                      <small>{module.description}</small>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <div className="role-error" role="alert">
                <AlertCircle size={17} />
                <span>{error}</span>
              </div>
            )}

            <div className="role-form-actions">
              <button
                type="button"
                className="role-secondary-btn"
                onClick={toggleForm}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="role-primary-btn"
              >
                <ShieldPlus size={17} />
                Save Role
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Existing roles */}
      <div className="role-list-card">
        <div className="role-list-header">
          <div className="role-heading-group">
            <div className="role-heading-icon">
              <ShieldCheck size={21} />
            </div>

            <div>
              <h3>Roles & Permissions</h3>

              <p>
                {roles.length} roles configured
              </p>
            </div>
          </div>

          <button
            type="button"
            className="role-primary-btn"
            onClick={toggleForm}
          >
            {showForm ? (
              <X size={17} />
            ) : (
              <ShieldPlus size={17} />
            )}

            {showForm ? "Cancel" : "Create Role"}
          </button>
        </div>

        <div className="role-toolbar">
          <div className="role-search-wrapper">
            <Search size={17} />

            <input
              type="text"
              placeholder="Search roles or permissions..."
              aria-label="Search roles"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />

            {search && (
              <button
                type="button"
                className="role-close-btn"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <span className="role-result-count">
            Showing {filteredRoles.length} of {roles.length}
          </span>
        </div>

        <div className="role-table-scroll">
          <table className="role-table">
            <thead>
              <tr>
                <th scope="col">Role Name</th>
                <th scope="col">Module Permissions</th>
                <th scope="col">Assigned Admins</th>
                <th scope="col">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredRoles.map((role) => {
                const assignedCount =
                  getAssignedCount(role.id);

                return (
                  <tr key={role.id}>
                    <td>
                      <div className="role-identity">
                        <div className="role-table-icon">
                          <ShieldCheck size={18} />
                        </div>

                        <span>{role.name}</span>
                      </div>
                    </td>

                    <td>
                      <div className="role-permissions">
                        {role.permissions.map((permission) => (
                          <span
                            className="role-permission-badge"
                            key={permission}
                          >
                            {permission}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td>
                      <span className="role-assigned-count">
                        <Users size={15} />

                        {assignedCount}{" "}
                        {assignedCount === 1
                          ? "admin"
                          : "admins"}
                      </span>
                    </td>

                    <td>
                      {assignedCount > 0 ? (
                        <span
                          className="role-protected"
                          title="This role cannot be deleted while assigned to an administrator."
                        >
                          <LockKeyhole size={14} />
                          In use
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="role-delete-btn"
                          onClick={() => deleteRole(role)}
                          aria-label={`Delete ${role.name}`}
                        >
                          <Trash2 size={15} />
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredRoles.length === 0 && (
                <tr>
                  <td colSpan="4">
                    <div className="role-empty">
                      <div className="role-empty-icon">
                        {search ? (
                          <Search size={25} />
                        ) : (
                          <ShieldCheck size={25} />
                        )}
                      </div>

                      <h4>
                        {search
                          ? "No matching roles"
                          : "No roles configured"}
                      </h4>

                      <p>
                        {search
                          ? "Try a different role name or permission."
                          : "Create your first role to assign module permissions."}
                      </p>

                      {search && (
                        <button
                          type="button"
                          className="role-secondary-btn"
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

        <div className="role-info">
          <LockKeyhole size={15} />

          <span>
            Roles assigned to administrators are protected
            from deletion.
          </span>
        </div>
      </div>
    </div>
  );
}

export default RoleManagement;
