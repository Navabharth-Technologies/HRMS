
import { useState } from "react";
import "./EmployeeManagement.css";

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
  },
];

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  department: "",
  designation: "",
  joiningDate: "",
  status: "Active",
};

function EmployeeManagement() {
  const [employees, setEmployees] = useState(initialEmployees);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm({
      ...form,
      [name]: value,
    });

    setError("");
  }

  function generateEmployeeId() {
    const numbers = employees.map((employee) =>
      Number(employee.id.replace("EMP", ""))
    );

    const nextNumber = Math.max(0, ...numbers) + 1;

    return `EMP${String(nextNumber).padStart(3, "0")}`;
  }

  function handleSubmit(event) {
    event.preventDefault();

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();

    if (
      !name ||
      !email ||
      !phone ||
      !form.department ||
      !form.designation.trim() ||
      !form.joiningDate
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!/^[0-9]{10}$/.test(phone)) {
      setError("Phone number must contain exactly 10 digits.");
      return;
    }

    const emailExists = employees.some(
      (employee) => employee.email.toLowerCase() === email
    );

    if (emailExists) {
      setError("An employee with this email already exists.");
      return;
    }

    const newEmployee = {
      id: generateEmployeeId(),
      name,
      email,
      phone,
      department: form.department,
      designation: form.designation.trim(),
      joiningDate: form.joiningDate,
      status: form.status,
    };

    setEmployees([...employees, newEmployee]);
    setForm({ ...emptyForm });
    setError("");
    setShowForm(false);
  }

  function toggleForm() {
    setShowForm(!showForm);
    setForm({ ...emptyForm });
    setError("");
  }

  const keyword = search.trim().toLowerCase();

  const filteredEmployees = employees.filter((employee) =>
    [
      employee.id,
      employee.name,
      employee.email,
      employee.department,
      employee.designation,
    ].some((value) => value.toLowerCase().includes(keyword))
  );

  return (
    <div className="employee-page">
      <div className="employee-page-heading">
        <div>
          <h1>Employee Management</h1>
          <p>Manage employee records and employment details.</p>
        </div>

        <button className="employee-primary-btn" onClick={toggleForm}>
          {showForm ? "Cancel" : "+ Add Employee"}
        </button>
      </div>

      {showForm && (
        <div className="employee-form-card">
          <h3>Add New Employee</h3>
          <p>Enter the employee's basic information.</p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="employee-form-grid">
              <div className="employee-field">
                <label htmlFor="employee-name">Full Name</label>
                <input
                  id="employee-name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter employee name"
                />
              </div>

              <div className="employee-field">
                <label htmlFor="employee-email">Email Address</label>
                <input
                  id="employee-email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Enter email address"
                />
              </div>

              <div className="employee-field">
                <label htmlFor="employee-phone">Phone Number</label>
                <input
                  id="employee-phone"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="10-digit phone number"
                />
              </div>

              <div className="employee-field">
                <label htmlFor="employee-department">Department</label>
                <select
                  id="employee-department"
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                >
                  <option value="">Select department</option>
                  <option value="Development">Development</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Finance">Finance</option>
                  <option value="Operations">Operations</option>
                  <option value="Marketing">Marketing</option>
                </select>
              </div>

              <div className="employee-field">
                <label htmlFor="employee-designation">Designation</label>
                <input
                  id="employee-designation"
                  name="designation"
                  value={form.designation}
                  onChange={handleChange}
                  placeholder="Example: Frontend Developer"
                />
              </div>

              <div className="employee-field">
                <label htmlFor="employee-joining">Joining Date</label>
                <input
                  id="employee-joining"
                  name="joiningDate"
                  type="date"
                  value={form.joiningDate}
                  onChange={handleChange}
                />
              </div>

              <div className="employee-field">
                <label htmlFor="employee-status">Employment Status</label>
                <select
                  id="employee-status"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            {error && (
              <p className="employee-error" role="alert">
                {error}
              </p>
            )}

            <button className="employee-primary-btn" type="submit">
              Save Employee
            </button>
          </form>
        </div>
      )}

      <div className="employee-table-card">
        <div className="employee-table-heading">
          <div>
            <h3>Employees</h3>
            <p>{employees.length} employee(s) registered</p>
          </div>

          <input
            className="employee-search"
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search employees..."
          />
        </div>

        <div className="employee-table-scroll">
          <table className="employee-table">
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Name</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Joining Date</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredEmployees.map((employee) => (
                <tr key={employee.id}>
                  <td className="employee-id">{employee.id}</td>
                  <td>
                    <strong>{employee.name}</strong>
                    <span className="employee-email">
                      {employee.email}
                    </span>
                  </td>
                  <td>{employee.department}</td>
                  <td>{employee.designation}</td>
                  <td>{employee.joiningDate}</td>
                  <td>
                    <span
                      className={
                        employee.status === "Active"
                          ? "employee-status active"
                          : "employee-status inactive"
                      }
                    >
                      {employee.status}
                    </span>
                  </td>
                </tr>
              ))}

              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan="6" className="employee-empty">
                    No employees found.
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

export default EmployeeManagement;
