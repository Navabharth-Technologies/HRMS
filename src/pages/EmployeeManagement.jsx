
import { useState, useRef, useLayoutEffect } from "react";

import {
  Users,
  UserCheck,
  UserMinus,
  Search,
  Plus,
  Pencil,
  ArrowLeft,
  CalendarDays,
} from "lucide-react";

import EmployeeAttendance from "./EmployeeAttendance.jsx";

import {
  getToday,
  formatDuration,
  getEmployeeAttendance,
} from "./attendanceUtils";

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

function EmployeeManagement({
  employees,
  setEmployees,
  attendance = [],
  setAttendance,
  shifts = [],
  shiftAssignments = [],
  onRequestCorrection,
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [attendanceDate, setAttendanceDate] = useState(getToday);

  const [mode, setMode] = useState("list");
  const [selectedId, setSelectedId] = useState(null);

  const [form, setForm] = useState(createEmptyForm);
  const [error, setError] = useState("");

  const [documentType, setDocumentType] = useState("");
  const [documentName, setDocumentName] = useState("");

  const pageRef = useRef(null);
  const tableRef = useRef(null);
  const directoryPosition = useRef(null);

  const selectedEmployee = employees.find(
    (employee) => employee.id === selectedId
  );

  // Remember where the employee directory was scrolled
  function rememberDirectoryPosition() {
    if (mode !== "list") return;

    const containers = [];
    let parent = pageRef.current?.parentElement;

    while (parent) {
      if (parent.scrollHeight > parent.clientHeight) {
        containers.push({
          element: parent,
          top: parent.scrollTop,
          left: parent.scrollLeft,
        });
      }

      parent = parent.parentElement;
    }

    directoryPosition.current = {
      top: window.scrollY,
      left: window.scrollX,
      tableLeft: tableRef.current?.scrollLeft || 0,
      containers,
    };
  }

  // Restore the directory when returning
  useLayoutEffect(() => {
    if (mode === "list") {
      const position = directoryPosition.current;

      if (position) {
        position.containers.forEach((item) => {
          if (item.element.isConnected) {
            item.element.scrollTop = item.top;
            item.element.scrollLeft = item.left;
          }
        });

        window.scrollTo({
          top: position.top,
          left: position.left,
          behavior: "instant",
        });

        if (tableRef.current) {
          tableRef.current.scrollLeft = position.tableLeft;
        }
      }
    } else {
      pageRef.current?.scrollIntoView({
        behavior: "instant",
        block: "start",
      });
    }
  }, [mode, selectedId]);

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
    rememberDirectoryPosition();
    resetForm();
    setSelectedId(null);
    setMode("add");
  }

  function openView(employee) {
    rememberDirectoryPosition();
    resetForm();
    setSelectedId(employee.id);
    setMode("view");
  }

  function openEdit(employee) {
    rememberDirectoryPosition();
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

      bank: {
        ...createEmptyForm().bank,
        ...employee.bank,
      },

      documents: (employee.documents || []).map(
        (doc) => ({ ...doc })
      ),
    });

    setMode("edit");
  }

  function openAttendance(employee) {
    rememberDirectoryPosition();

    setSelectedId(employee.id);
    setMode("attendance");
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
    const numbers = currentEmployees
      .map((employee) =>
        Number(employee.id.replace("EMP", ""))
      )
      .filter(Number.isFinite);

    const nextNumber = Math.max(0, ...numbers) + 1;

    return `EMP${String(nextNumber).padStart(3, "0")}`;
  }

  function addDocument() {
    const name = documentName.trim();

    if (!documentType || !name) {
      setError(
        "Select a document type and enter a document name."
      );
      return;
    }

    const newDocument = {
      id: crypto.randomUUID(),
      type: documentType,
      name,
    };

    setForm((currentForm) => ({
      ...currentForm,

      documents: [
        ...currentForm.documents,
        newDocument,
      ],
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
      setError(
        "Please fill in all required employee fields."
      );
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!/^[0-9]{10}$/.test(phone)) {
      setError(
        "Phone number must contain exactly 10 digits."
      );
      return;
    }

    const emailExists = employees.some(
      (employee) =>
        employee.email.toLowerCase() === email &&
        employee.id !== selectedId
    );

    if (emailExists) {
      setError(
        "An employee with this email already exists."
      );
      return;
    }

    // Prevent joining date changes from invalidating attendance
    if (
      mode === "edit" &&
      attendance.some(
        (record) =>
          record.employeeId === selectedId &&
          record.date < form.joiningDate
      )
    ) {
      setError(
        "Joining date cannot be later than existing attendance records."
      );
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
        setError(
          "Please complete all bank details or leave them blank."
        );
        return;
      }

      if (!/^[0-9]{9,18}$/.test(bank.accountNumber)) {
        setError(
          "Bank account number must contain 9 to 18 digits."
        );
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

      documents: form.documents.map(
        (doc) => ({ ...doc })
      ),
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

  function getInitials(name) {
    return (name || "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join("");
  }

  const keyword = search.trim().toLowerCase();

  const activeCount = employees.filter(
    (employee) => employee.status === "Active"
  ).length;

  const inactiveCount = employees.filter(
    (employee) => employee.status === "Inactive"
  ).length;

  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch = [
      employee.id,
      employee.name,
      employee.email,
      employee.department,
      employee.designation,
    ].some((value) =>
      String(value || "")
        .toLowerCase()
        .includes(keyword)
    );

    const matchesStatus =
      statusFilter === "All" ||
      employee.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = [
    {
      title: "Total Employees",
      value: employees.length,
      icon: Users,
      color: "indigo",
      filter: "All",
    },
    {
      title: "Active Employees",
      value: activeCount,
      icon: UserCheck,
      color: "green",
      filter: "Active",
    },
    {
      title: "Inactive Employees",
      value: inactiveCount,
      icon: UserMinus,
      color: "slate",
      filter: "Inactive",
    },
  ];

  return (
    <div
      className="employee-page"
      ref={pageRef}
      style={{ scrollMarginTop: "110px" }}
    >

      {/* Dedicated attendance screen */}

      {mode === "attendance" && selectedEmployee && (
        <EmployeeAttendance
          key={selectedEmployee.id}
          employee={selectedEmployee}
          attendance={attendance}
          setAttendance={setAttendance}
          shifts={shifts}
          shiftAssignments={shiftAssignments}
          initialDate={attendanceDate}
          onBack={closePanel}
          onRequestCorrection={onRequestCorrection}
        />
      )}

      {mode === "attendance" && !selectedEmployee && (
        <div className="employee-details-card">
          <p>Employee record could not be found.</p>

          <button
            type="button"
            className="employee-secondary-btn"
            onClick={closePanel}
          >
            Back to Employees
          </button>
        </div>
      )}

      {/* Employee overview */}

      {mode === "list" && (
        <div className="employee-overview">

          {stats.map((item) => {
            const Icon = item.icon;

            return (
              <button
                type="button"
                key={item.title}
                className={`employee-stat ${statusFilter === item.filter
                    ? "selected"
                    : ""
                  }`}
                aria-pressed={
                  statusFilter === item.filter
                }
                onClick={() =>
                  setStatusFilter(item.filter)
                }
              >
                <div
                  className={`employee-stat-icon ${item.color}`}
                >
                  <Icon size={20} strokeWidth={1.8} />
                </div>

                <div>
                  <strong>
                    {String(item.value).padStart(2, "0")}
                  </strong>

                  <span>{item.title}</span>
                </div>
              </button>
            );
          })}

        </div>
      )}

      {/* Employee profile and form navigation */}

      {["view", "add", "edit"].includes(mode) && (
        <div className="employee-page-heading">

          <button
            type="button"
            className="employee-back-btn"
            onClick={closePanel}
          >
            <ArrowLeft size={17} />
            Back to Employees
          </button>

        </div>
      )}

      {/* Employee details */}

      {mode === "view" && selectedEmployee && (
        <div className="employee-details-card">

          <div className="employee-section-heading">

            <div>
              <h3>Employee Details</h3>

              <p>
                {selectedEmployee.name} ·{" "}
                {selectedEmployee.id}
              </p>
            </div>

            <button
              type="button"
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
              <div
                className="employee-detail"
                key={label}
              >
                <span>{label}</span>
                <strong>{value || "Not provided"}</strong>
              </div>
            ))}

          </div>

          <h4 className="employee-subheading">
            Bank Details
          </h4>

          <div className="employee-details-grid">

            <div className="employee-detail">
              <span>Account Holder Name</span>

              <strong>
                {selectedEmployee.bank?.holderName ||
                  "Not provided"}
              </strong>
            </div>

            <div className="employee-detail">
              <span>Bank Name</span>

              <strong>
                {selectedEmployee.bank?.bankName ||
                  "Not provided"}
              </strong>
            </div>

            <div className="employee-detail">
              <span>Account Number</span>

              <strong>
                {maskAccountNumber(
                  selectedEmployee.bank?.accountNumber
                )}
              </strong>
            </div>

            <div className="employee-detail">
              <span>IFSC Code</span>

              <strong>
                {selectedEmployee.bank?.ifsc ||
                  "Not provided"}
              </strong>
            </div>

          </div>

          <h4 className="employee-subheading">
            Documents
          </h4>

          {(selectedEmployee.documents || []).length === 0 ? (
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

      {/* Add and edit employee form */}

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
                  ? `Update details for ${selectedEmployee?.name || selectedId
                  } · ${selectedId}`
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
                <label htmlFor="employee-name">
                  Full Name
                </label>

                <input
                  id="employee-name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter full name"
                />
              </div>

              <div className="employee-field">
                <label htmlFor="employee-email">
                  Email Address
                </label>

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
                <label htmlFor="employee-phone">
                  Phone Number
                </label>

                <input
                  id="employee-phone"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="10-digit phone number"
                />
              </div>

              <div className="employee-field">
                <label htmlFor="employee-department">
                  Department
                </label>

                <select
                  id="employee-department"
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                >
                  <option value="">
                    Select department
                  </option>

                  {departments.map((department) => (
                    <option
                      key={department}
                      value={department}
                    >
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
              Optional for now. Complete all four fields
              if adding bank information. Use test data only.
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
                <label htmlFor="bank-name">
                  Bank Name
                </label>

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
                <label htmlFor="bank-ifsc">
                  IFSC Code
                </label>

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
              Record document names only. Actual file
              upload will be implemented with the backend.
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
                  <option value="">
                    Select document type
                  </option>

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

      {/* Employee directory */}

      {mode === "list" && (
        <div className="employee-table-card">

          <div className="employee-table-heading">

            <div>
              <h3>Employee Directory</h3>

              <p>
                Manage employee information and daily attendance.
              </p>
            </div>

            <button
              type="button"
              className="employee-primary-btn employee-add-btn"
              onClick={openAddForm}
            >
              <Plus size={17} />
              Add Employee
            </button>

          </div>

          <div className="employee-toolbar">

            <div className="employee-search-box">

              <Search size={17} />

              <input
                className="employee-search"
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search employees..."
                aria-label="Search employees"
              />

            </div>

            <select
              className="employee-filter"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              aria-label="Filter employees by status"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            <div className="employee-date-control">

              <label htmlFor="attendance-date">
                Attendance Date
              </label>

              <input
                id="attendance-date"
                type="date"
                value={attendanceDate}
                max={getToday()}
                onChange={(event) => {
                  const date = event.target.value;

                  if (date && date <= getToday()) {
                    setAttendanceDate(date);
                  }
                }}
              />

            </div>

          </div>

          <div
            className="employee-table-scroll"
            ref={tableRef}
          >

            <table className="employee-table employee-attendance-table">

              <thead>
                <tr>
                  <th>Edit</th>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Employment</th>
                  <th>Punch In</th>
                  <th>Punch Out</th>
                  <th>Work Hours</th>
                  <th>Overtime</th>
                  <th>Attendance</th>
                  <th>Manage Attendance</th>
                </tr>
              </thead>

              <tbody>

                {filteredEmployees.map((employee) => {
                  const daily = getEmployeeAttendance(
                    employee,
                    attendanceDate,
                    attendance,
                    shifts,
                    shiftAssignments
                  );

                  return (
                    <tr key={employee.id}>

                      {/* Edit employee information */}

                      <td className="employee-edit-cell">

                        <button
                          type="button"
                          className="employee-edit-btn"
                          onClick={() => openEdit(employee)}
                          title="Edit employee information"
                          aria-label={`Edit ${employee.name}`}
                        >
                          <Pencil size={16} />
                        </button>

                      </td>

                      {/* Click employee name to view profile */}

                      <td>

                        <div className="employee-identity">

                          <div className="employee-avatar">
                            {getInitials(employee.name)}
                          </div>

                          <div>

                            <button
                              type="button"
                              className="employee-name employee-name-link"
                              onClick={() => openView(employee)}
                              title="View employee details"
                            >
                              {employee.name}
                            </button>

                            <span className="employee-email">
                              {employee.id}
                            </span>

                          </div>

                        </div>

                      </td>

                      <td>

                        <strong className="employee-department">
                          {employee.department}
                        </strong>

                        <span className="employee-email">
                          {employee.designation}
                        </span>

                      </td>

                      <td>

                        <span
                          className={`employee-status ${employee.status === "Active"
                              ? "active"
                              : "inactive"
                            }`}
                        >
                          <span className="employee-status-dot" />
                          {employee.status}
                        </span>

                      </td>

                      <td className="employee-time">
                        {daily.checkIn}
                      </td>

                      <td className="employee-time">
                        {daily.checkOut}
                      </td>

                      <td>

                        <strong className="employee-work-hours">
                          {formatDuration(daily.workedMinutes)}
                        </strong>

                        <span className="employee-email">
                          {daily.shiftName}
                        </span>

                      </td>

                      <td>

                        <strong
                          className={
                            daily.overtimeMinutes > 0
                              ? "employee-ot-value"
                              : "employee-time"
                          }
                        >
                          {formatDuration(daily.overtimeMinutes)}
                        </strong>

                        {daily.overtimeStatus && (
                          <span className="employee-email">
                            {daily.overtimeStatus}
                          </span>
                        )}

                      </td>

                      <td>

                        <span
                          className={`employee-attendance-status ${daily.attendanceStatus
                              .toLowerCase()
                              .replace(/\s+/g, "-")
                            }`}
                        >
                          <span className="employee-status-dot" />
                          {daily.attendanceStatus}
                        </span>

                      </td>

                      {/* Manage employee attendance */}

                      <td>

                        <button
                          type="button"
                          className="employee-punch-btn employee-manage-attendance-btn"
                          onClick={() =>
                            openAttendance(employee)
                          }
                          title={`Manage attendance for ${employee.name}`}
                        >
                          <CalendarDays size={15} />
                          Manage Attendance
                        </button>

                      </td>

                    </tr>
                  );
                })}

                {filteredEmployees.length === 0 && (
                  <tr>

                    <td
                      colSpan="10"
                      className="employee-empty"
                    >

                      <div className="employee-empty-state">

                        <Users size={30} strokeWidth={1.5} />

                        <strong>No employees found</strong>

                        <span>
                          Try changing your search or status filter.
                        </span>

                        <button
                          type="button"
                          className="employee-secondary-btn"
                          onClick={() => {
                            setSearch("");
                            setStatusFilter("All");
                          }}
                        >
                          Clear Filters
                        </button>

                      </div>

                    </td>

                  </tr>
                )}

              </tbody>

            </table>

          </div>

          <div className="employee-table-footer">
            Showing {filteredEmployees.length} of{" "}
            {employees.length} employees
          </div>

        </div>
      )}

    </div>
  );
}

export default EmployeeManagement;
