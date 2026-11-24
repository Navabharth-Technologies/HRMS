
import { useState } from "react";
import "./EmployeeManagement.css";

const departments = [
  "Development",
  "Human Resources",
  "Finance",
  "Operations",
  "Marketing",
];

const documentTypes = [
  "Identity Proof",
  "Address Proof",
  "Education Certificate",
  "Experience Letter",
  "Other",
];

function createEmptyForm() {
  return {
    name: "",
    email: "",
    phone: "",
    department: "",
    designation: "",
    joiningDate: "",
    status: "Active",
    bank: {
      holderName: "",
      bankName: "",
      accountNumber: "",
      ifsc: "",
    },
    documents: [],
  };
}

function EmployeeManagement({ employees, setEmployees }) {
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("list");
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(createEmptyForm);
  const [error, setError] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [documentName, setDocumentName] = useState("");

  const selectedEmployee = employees.find(
    (employee) => employee.id === selectedId
  );

  function resetForm() {
    setForm(createEmptyForm());
    setError("");
    setDocumentType("");
    setDocumentName("");
  }

  function closePanel() {
    resetForm();
    setSelectedId(null);
    setMode("list");
  }

  function openAddForm() {
    resetForm();
    setSelectedId(null);
    setMode("add");
  }

  function openView(employee) {
    resetForm();
    setSelectedId(employee.id);
    setMode("view");
  }

  function openEdit(employee) {
    resetForm();
    setSelectedId(employee.id);

    setForm({
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      department: employee.department,
      designation: employee.designation,
      joiningDate: employee.joiningDate,
      status: employee.status,
      bank: { ...employee.bank },
      documents: employee.documents.map((doc) => ({ ...doc })),
    });

    setMode("edit");
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    setError("");
  }

  function handleBankChange(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      bank: {
        ...currentForm.bank,
        [name]: value,
      },
    }));

    setError("");
  }

  function generateEmployeeId(currentEmployees) {
    const numbers = currentEmployees.map((employee) =>
      Number(employee.id.replace("EMP", ""))
    );

    const nextNumber = Math.max(0, ...numbers) + 1;

    return `EMP${String(nextNumber).padStart(3, "0")}`;
  }

  function addDocument() {
    const name = documentName.trim();

    if (!documentType || !name) {
      setError("Select a document type and enter a document name.");
      return;
    }

    const newDocument = {
      id: crypto.randomUUID(),
      type: documentType,
      name,
    };

    setForm((currentForm) => ({
      ...currentForm,
      documents: [...currentForm.documents, newDocument],
    }));

    setDocumentType("");
    setDocumentName("");
    setError("");
  }

  function removeDocument(documentId) {
    setForm((currentForm) => ({
      ...currentForm,
      documents: currentForm.documents.filter(
        (doc) => doc.id !== documentId
      ),
    }));

    setError("");
  }

  function handleSubmit(event) {
    event.preventDefault();

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();
    const designation = form.designation.trim();

    if (
      !name ||
      !email ||
      !phone ||
      !form.department ||
      !designation ||
      !form.joiningDate
    ) {
      setError("Please fill in all required employee fields.");
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
      (employee) =>
        employee.email.toLowerCase() === email &&
        employee.id !== selectedId
    );

    if (emailExists) {
      setError("An employee with this email already exists.");
      return;
    }

    const bank = {
      holderName: form.bank.holderName.trim(),
      bankName: form.bank.bankName.trim(),
      accountNumber: form.bank.accountNumber.trim(),
      ifsc: form.bank.ifsc.trim().toUpperCase(),
    };

    const hasBankDetails = Object.values(bank).some(
      (value) => value !== ""
    );

    if (hasBankDetails) {
      if (Object.values(bank).some((value) => !value)) {
        setError("Please complete all bank details or leave them blank.");
        return;
      }

      if (!/^[0-9]{9,18}$/.test(bank.accountNumber)) {
        setError("Bank account number must contain 9 to 18 digits.");
        return;
      }

      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bank.ifsc)) {
        setError("Please enter a valid IFSC code.");
        return;
      }
    }

    const employeeData = {
      name,
      email,
      phone,
      department: form.department,
      designation,
      joiningDate: form.joiningDate,
      status: form.status,
      bank,
      documents: form.documents.map((doc) => ({ ...doc })),
    };

    if (mode === "edit") {
      setEmployees((currentEmployees) =>
        currentEmployees.map((employee) =>
          employee.id === selectedId
            ? { ...employee, ...employeeData }
            : employee
        )
      );
    }

    if (mode === "add") {
      setEmployees((currentEmployees) => {
        const newEmployee = {
          id: generateEmployeeId(currentEmployees),
          ...employeeData,
        };

        return [...currentEmployees, newEmployee];
      });
    }

    closePanel();
  }

  function maskAccountNumber(number) {
    if (!number) return "Not provided";
    return "•••• " + number.slice(-4);
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
          <p>Manage employee profiles and employment details.</p>
        </div>

        <button
          className="employee-primary-btn"
          onClick={mode === "list" ? openAddForm : closePanel}
        >
          {mode === "list" ? "+ Add Employee" : "Back to Employees"}
        </button>
      </div>

      {mode === "view" && selectedEmployee && (
        <div className="employee-details-card">
          <div className="employee-section-heading">
            <div>
              <h3>Employee Details</h3>
              <p>Employee ID: {selectedEmployee.id}</p>
            </div>

            <button
              className="employee-primary-btn"
              onClick={() => openEdit(selectedEmployee)}
            >
              Edit Employee
            </button>
          </div>

          <h4 className="employee-subheading">
            Personal & Employment Information
          </h4>

          <div className="employee-details-grid">
            {[
              ["Full Name", selectedEmployee.name],
              ["Email Address", selectedEmployee.email],
              ["Phone Number", selectedEmployee.phone],
              ["Department", selectedEmployee.department],
              ["Designation", selectedEmployee.designation],
              ["Joining Date", selectedEmployee.joiningDate],
              ["Employment Status", selectedEmployee.status],
            ].map(([label, value]) => (
              <div className="employee-detail" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>

          <h4 className="employee-subheading">Bank Details</h4>

          <div className="employee-details-grid">
            <div className="employee-detail">
              <span>Account Holder Name</span>
              <strong>
                {selectedEmployee.bank.holderName || "Not provided"}
              </strong>
            </div>

            <div className="employee-detail">
              <span>Bank Name</span>
              <strong>
                {selectedEmployee.bank.bankName || "Not provided"}
              </strong>
            </div>

            <div className="employee-detail">
              <span>Account Number</span>
              <strong>
                {maskAccountNumber(
                  selectedEmployee.bank.accountNumber
                )}
              </strong>
            </div>

            <div className="employee-detail">
              <span>IFSC Code</span>
              <strong>
                {selectedEmployee.bank.ifsc || "Not provided"}
              </strong>
            </div>
          </div>

          <h4 className="employee-subheading">Documents</h4>

          {selectedEmployee.documents.length === 0 ? (
            <p className="employee-muted">
              No document entries added.
            </p>
          ) : (
            <div className="employee-document-list">
              {selectedEmployee.documents.map((doc) => (
                <div
                  className="employee-document-item"
                  key={doc.id}
                >
                  <div>
                    <strong>{doc.name}</strong>
                    <span>{doc.type}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(mode === "add" || mode === "edit") && (
        <div className="employee-form-card">
          <div className="employee-section-heading">
            <div>
              <h3>
                {mode === "edit"
                  ? "Edit Employee"
                  : "Add New Employee"}
              </h3>

              <p>
                {mode === "edit"
                  ? `Update details for ${selectedId}`
                  : "Enter the employee's information."}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <h4 className="employee-subheading">
              Personal & Employment Information
            </h4>

            <div className="employee-form-grid">
              <div className="employee-field">
                <label htmlFor="employee-name">Full Name</label>
                <input
                  id="employee-name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter full name"
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

                  {departments.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
              </div>

              <div className="employee-field">
                <label htmlFor="employee-designation">
                  Designation
                </label>
                <input
                  id="employee-designation"
                  name="designation"
                  value={form.designation}
                  onChange={handleChange}
                  placeholder="Example: Frontend Developer"
                />
              </div>

              <div className="employee-field">
                <label htmlFor="employee-joining">
                  Joining Date
                </label>
                <input
                  id="employee-joining"
                  name="joiningDate"
                  type="date"
                  value={form.joiningDate}
                  onChange={handleChange}
                />
              </div>

              <div className="employee-field">
                <label htmlFor="employee-status">
                  Employment Status
                </label>
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

            <h4 className="employee-subheading">
              Bank Details
            </h4>

            <p className="employee-muted">
              Optional for now. Complete all four fields if
              adding bank information. Use test data only.
            </p>

            <div className="employee-form-grid">
              <div className="employee-field">
                <label htmlFor="bank-holder">
                  Account Holder Name
                </label>
                <input
                  id="bank-holder"
                  name="holderName"
                  value={form.bank.holderName}
                  onChange={handleBankChange}
                  placeholder="Account holder name"
                />
              </div>

              <div className="employee-field">
                <label htmlFor="bank-name">Bank Name</label>
                <input
                  id="bank-name"
                  name="bankName"
                  value={form.bank.bankName}
                  onChange={handleBankChange}
                  placeholder="Bank name"
                />
              </div>

              <div className="employee-field">
                <label htmlFor="bank-account">
                  Account Number
                </label>
                <input
                  id="bank-account"
                  name="accountNumber"
                  type="text"
                  inputMode="numeric"
                  value={form.bank.accountNumber}
                  onChange={handleBankChange}
                  placeholder="9 to 18 digits"
                />
              </div>

              <div className="employee-field">
                <label htmlFor="bank-ifsc">IFSC Code</label>
                <input
                  id="bank-ifsc"
                  name="ifsc"
                  value={form.bank.ifsc}
                  onChange={handleBankChange}
                  placeholder="Example: ABCD0123456"
                />
              </div>
            </div>

            <h4 className="employee-subheading">
              Employee Documents
            </h4>

            <p className="employee-muted">
              Record document names only. Actual file upload
              will be implemented with the backend.
            </p>

            <div className="employee-document-form">
              <div className="employee-field">
                <label htmlFor="document-type">
                  Document Type
                </label>
                <select
                  id="document-type"
                  value={documentType}
                  onChange={(event) =>
                    setDocumentType(event.target.value)
                  }
                >
                  <option value="">Select document type</option>

                  {documentTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="employee-field">
                <label htmlFor="document-name">
                  Document Name
                </label>
                <input
                  id="document-name"
                  value={documentName}
                  onChange={(event) =>
                    setDocumentName(event.target.value)
                  }
                  placeholder="Example: Degree Certificate"
                />
              </div>

              <button
                type="button"
                className="employee-secondary-btn"
                onClick={addDocument}
              >
                + Add Document
              </button>
            </div>

            {form.documents.length > 0 && (
              <div className="employee-document-list">
                {form.documents.map((doc) => (
                  <div
                    className="employee-document-item"
                    key={doc.id}
                  >
                    <div>
                      <strong>{doc.name}</strong>
                      <span>{doc.type}</span>
                    </div>

                    <button
                      type="button"
                      className="employee-remove-btn"
                      onClick={() => removeDocument(doc.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <p className="employee-error" role="alert">
                {error}
              </p>
            )}

            <div className="employee-form-actions">
              <button
                className="employee-primary-btn"
                type="submit"
              >
                {mode === "edit"
                  ? "Save Changes"
                  : "Save Employee"}
              </button>

              <button
                className="employee-secondary-btn"
                type="button"
                onClick={closePanel}
              >
                Cancel
              </button>
            </div>
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
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredEmployees.map((employee) => (
                <tr key={employee.id}>
                  <td className="employee-id">
                    {employee.id}
                  </td>

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

                  <td>
                    <div className="employee-row-actions">
                      <button
                        className="employee-view-btn"
                        onClick={() => openView(employee)}
                      >
                        View
                      </button>

                      <button
                        className="employee-edit-btn"
                        onClick={() => openEdit(employee)}
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredEmployees.length === 0 && (
                <tr>
                  <td
                    colSpan="7"
                    className="employee-empty"
                  >
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
