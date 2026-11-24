
import { useState } from "react";
import "./ShiftManagement.css";

function toMinutes(time) {
  if (!time) return 0;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatMinutes(minutes) {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours}h ${String(remaining).padStart(2, "0")}m`;
}

function createEmptyForm() {
  return {
    name: "",
    type: "Fixed",
    startTime: "",
    endTime: "",
    expectedHours: "08:00",
  };
}

function ShiftManagement({
  employees,
  shifts,
  setShifts,
  shiftAssignments,
  setShiftAssignments,
  attendance,
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(createEmptyForm);
  const [error, setError] = useState("");
  const [assignmentEmployee, setAssignmentEmployee] = useState("");
  const [assignmentShift, setAssignmentShift] = useState("");
  const [assignmentError, setAssignmentError] = useState("");
  const [search, setSearch] = useState("");

  const activeEmployees = employees.filter(
    (employee) => employee.status === "Active"
  );

  function getShift(id) {
    return shifts.find((shift) => shift.id === id);
  }

  function getAssignedShift(employeeId) {
    const assignment = shiftAssignments.find(
      (item) => item.employeeId === employeeId
    );
    return assignment ? getShift(assignment.shiftId) : null;
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "type" && value === "Flexible"
        ? { startTime: "", endTime: "" }
        : {}),
    }));

    setError("");
  }

  function resetForm() {
    setForm(createEmptyForm());
    setError("");
    setShowForm(false);
  }

  function saveShift(event) {
    event.preventDefault();

    const name = form.name.trim();

    if (!name) {
      setError("Enter a shift name.");
      return;
    }

    if (
      shifts.some(
        (shift) => shift.name.toLowerCase() === name.toLowerCase()
      )
    ) {
      setError("A shift with this name already exists.");
      return;
    }

    const expectedMinutes = toMinutes(form.expectedHours);

    if (expectedMinutes <= 0 || expectedMinutes > 1440) {
      setError("Expected working hours must be between 00:01 and 24:00.");
      return;
    }

    if (form.type === "Fixed") {
      if (!form.startTime || !form.endTime) {
        setError("Enter the fixed shift start and end times.");
        return;
      }

      const shiftDuration =
        toMinutes(form.endTime) - toMinutes(form.startTime);

      if (shiftDuration <= 0) {
        setError("Shift end must be after shift start.");
        return;
      }

      if (expectedMinutes > shiftDuration) {
        setError(
          "Expected working hours cannot exceed the shift duration."
        );
        return;
      }
    }

    const newShift = {
      id: crypto.randomUUID(),
      name,
      type: form.type,
      startTime: form.type === "Fixed" ? form.startTime : "",
      endTime: form.type === "Fixed" ? form.endTime : "",
      expectedMinutes,
    };

    setShifts((current) => [...current, newShift]);
    resetForm();
  }

  function assignShift(event) {
    event.preventDefault();

    if (!assignmentEmployee || !assignmentShift) {
      setAssignmentError("Select an employee and a shift.");
      return;
    }

    const employeeExists = activeEmployees.some(
      (employee) => employee.id === assignmentEmployee
    );

    const shiftExists = shifts.some(
      (shift) => shift.id === assignmentShift
    );

    if (!employeeExists || !shiftExists) {
      setAssignmentError("Select a valid active employee and shift.");
      return;
    }

    setShiftAssignments((current) => {
      const existing = current.some(
        (item) => item.employeeId === assignmentEmployee
      );

      if (existing) {
        return current.map((item) =>
          item.employeeId === assignmentEmployee
            ? { ...item, shiftId: assignmentShift }
            : item
        );
      }

      return [
        ...current,
        {
          employeeId: assignmentEmployee,
          shiftId: assignmentShift,
        },
      ];
    });

    setAssignmentEmployee("");
    setAssignmentShift("");
    setAssignmentError("");
  }

  function removeAssignment(employeeId) {
    if (!window.confirm("Remove this employee's shift assignment?")) {
      return;
    }

    setShiftAssignments((current) =>
      current.filter((item) => item.employeeId !== employeeId)
    );
  }

  function deleteShift(id) {
    const isAssigned = shiftAssignments.some(
      (item) => item.shiftId === id
    );

    if (isAssigned) {
      window.alert(
        "Cannot delete this shift because it is assigned to an employee."
      );
      return;
    }

    if (!window.confirm("Delete this shift?")) return;

    setShifts((current) =>
      current.filter((shift) => shift.id !== id)
    );
  }

  function getWorkingMinutes(record) {
    if (record.status !== "Present") return 0;

    const total =
      toMinutes(record.checkOut) - toMinutes(record.checkIn);

    const breaks = record.breaks.reduce(
      (sum, item) =>
        sum + toMinutes(item.end) - toMinutes(item.start),
      0
    );

    return total - breaks;
  }

  const filteredEmployees = employees.filter((employee) =>
    [employee.id, employee.name, employee.department]
      .some((value) =>
        value.toLowerCase().includes(search.trim().toLowerCase())
      )
  );

  const assignedCount = employees.filter(
    (employee) => Boolean(getAssignedShift(employee.id))
  ).length;

  return (
    <div className="shift-page">
      <div className="shift-heading">
        <div>
          <h1>Shift Management</h1>
          <p>Configure fixed and flexible shifts for employees.</p>
        </div>

        <button
          className="shift-primary-btn"
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setShowForm(true);
            }
          }}
        >
          {showForm ? "Cancel" : "+ Create Shift"}
        </button>
      </div>

      <div className="shift-stats">
        <div className="shift-stat">
          <span>Total Shifts</span>
          <strong>{shifts.length}</strong>
        </div>

        <div className="shift-stat">
          <span>Assigned Employees</span>
          <strong>{assignedCount}</strong>
        </div>

        <div className="shift-stat">
          <span>Unassigned Employees</span>
          <strong>{employees.length - assignedCount}</strong>
        </div>
      </div>

      {showForm && (
        <div className="shift-card">
          <h3>Create Shift</h3>
          <p className="shift-muted">
            Fixed shifts have scheduled times. Flexible shifts
            require only expected working hours.
          </p>

          <form onSubmit={saveShift} noValidate>
            <div className="shift-form-grid">
              <div className="shift-field">
                <label htmlFor="shift-name">Shift Name</label>
                <input
                  id="shift-name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Example: General Shift"
                />
              </div>

              <div className="shift-field">
                <label htmlFor="shift-type">Shift Type</label>
                <select
                  id="shift-type"
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                >
                  <option value="Fixed">Fixed</option>
                  <option value="Flexible">Flexible</option>
                </select>
              </div>

              {form.type === "Fixed" && (
                <>
                  <div className="shift-field">
                    <label htmlFor="shift-start">Start Time</label>
                    <input
                      id="shift-start"
                      type="time"
                      name="startTime"
                      value={form.startTime}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="shift-field">
                    <label htmlFor="shift-end">End Time</label>
                    <input
                      id="shift-end"
                      type="time"
                      name="endTime"
                      value={form.endTime}
                      onChange={handleChange}
                    />
                  </div>
                </>
              )}

              <div className="shift-field">
                <label htmlFor="shift-hours">
                  Expected Net Working Hours
                </label>
                <input
                  id="shift-hours"
                  type="time"
                  name="expectedHours"
                  value={form.expectedHours}
                  onChange={handleChange}
                />
              </div>
            </div>

            {error && (
              <p className="shift-error" role="alert">{error}</p>
            )}

            <button type="submit" className="shift-primary-btn">
              Save Shift
            </button>
          </form>
        </div>
      )}

      <div className="shift-card">
        <h3>Available Shifts</h3>
        <p className="shift-muted">
          Delete is blocked when a shift has assigned employees.
        </p>

        <div className="shift-table-scroll">
          <table className="shift-table">
            <thead>
              <tr>
                <th>Shift Name</th>
                <th>Type</th>
                <th>Schedule</th>
                <th>Expected Hours</th>
                <th>Assigned</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {shifts.map((shift) => {
                const count = shiftAssignments.filter(
                  (item) => item.shiftId === shift.id
                ).length;

                return (
                  <tr key={shift.id}>
                    <td><strong>{shift.name}</strong></td>
                    <td>
                      <span className="shift-type">{shift.type}</span>
                    </td>
                    <td>
                      {shift.type === "Fixed"
                        ? `${shift.startTime} – ${shift.endTime}`
                        : "Flexible timing"}
                    </td>
                    <td>{formatMinutes(shift.expectedMinutes)}</td>
                    <td>{count}</td>
                    <td>
                      <button
                        className="shift-delete-btn"
                        onClick={() => deleteShift(shift.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}

              {shifts.length === 0 && (
                <tr>
                  <td colSpan="6" className="shift-empty">
                    No shifts configured yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="shift-card">
        <h3>Assign Shift to Employee</h3>
        <p className="shift-muted">
          Reassigning an employee replaces their current shift.
        </p>

        <form onSubmit={assignShift} noValidate>
          <div className="shift-assignment-grid">
            <div className="shift-field">
              <label htmlFor="assign-employee">Employee</label>
              <select
                id="assign-employee"
                value={assignmentEmployee}
                onChange={(event) => {
                  setAssignmentEmployee(event.target.value);
                  setAssignmentError("");
                }}
              >
                <option value="">Select employee</option>
                {activeEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.id} - {employee.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="shift-field">
              <label htmlFor="assign-shift">Shift</label>
              <select
                id="assign-shift"
                value={assignmentShift}
                onChange={(event) => {
                  setAssignmentShift(event.target.value);
                  setAssignmentError("");
                }}
              >
                <option value="">Select shift</option>
                {shifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {shift.name} ({shift.type})
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" className="shift-primary-btn">
              Save Assignment
            </button>
          </div>

          {assignmentError && (
            <p className="shift-error" role="alert">
              {assignmentError}
            </p>
          )}
        </form>
      </div>

      <div className="shift-card">
        <div className="shift-table-heading">
          <div>
            <h3>Employee Shift Assignments</h3>
            <p className="shift-muted">
              Current shift assigned to each employee.
            </p>
          </div>

          <input
            className="shift-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search employees..."
          />
        </div>

        <div className="shift-table-scroll">
          <table className="shift-table">
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Employee</th>
                <th>Department</th>
                <th>Shift</th>
                <th>Type</th>
                <th>Expected Hours</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredEmployees.map((employee) => {
                const shift = getAssignedShift(employee.id);

                return (
                  <tr key={employee.id}>
                    <td>{employee.id}</td>
                    <td><strong>{employee.name}</strong></td>
                    <td>{employee.department}</td>
                    <td>{shift ? shift.name : "Not Assigned"}</td>
                    <td>{shift ? shift.type : "—"}</td>
                    <td>
                      {shift
                        ? formatMinutes(shift.expectedMinutes)
                        : "—"}
                    </td>
                    <td>
                      {shift ? (
                        <button
                          className="shift-delete-btn"
                          onClick={() =>
                            removeAssignment(employee.id)
                          }
                        >
                          Remove
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan="7" className="shift-empty">
                    No employees found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="shift-card">
        <h3>Attendance vs Expected Hours</h3>
        <p className="shift-muted">
          Comparison is informational only. Differences do not
          automatically create overtime or salary deductions.
        </p>

        <div className="shift-table-scroll">
          <table className="shift-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee</th>
                <th>Assigned Shift</th>
                <th>Expected</th>
                <th>Worked</th>
                <th>Difference</th>
              </tr>
            </thead>

            <tbody>
              {attendance.map((record) => {
                const shift = getAssignedShift(record.employeeId);
                const worked = getWorkingMinutes(record);

                const difference = shift && record.status === "Present"
                  ? worked - shift.expectedMinutes
                  : null;

                return (
                  <tr key={record.id}>
                    <td>{record.date}</td>
                    <td>
                      {employees.find(
                        (employee) =>
                          employee.id === record.employeeId
                      )?.name || record.employeeId}
                    </td>
                    <td>{shift ? shift.name : "Not Assigned"}</td>
                    <td>
                      {shift
                        ? formatMinutes(shift.expectedMinutes)
                        : "—"}
                    </td>
                    <td>
                      {record.status === "Present"
                        ? formatMinutes(worked)
                        : "Absent"}
                    </td>
                    <td>
                      {difference === null
                        ? "—"
                        : difference >= 0
                        ? `+${formatMinutes(difference)}`
                        : `-${formatMinutes(Math.abs(difference))}`}
                    </td>
                  </tr>
                );
              })}

              {attendance.length === 0 && (
                <tr>
                  <td colSpan="6" className="shift-empty">
                    No attendance records available.
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

export default ShiftManagement;
