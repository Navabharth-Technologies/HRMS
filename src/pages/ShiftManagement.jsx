
import { useState } from "react";
import "./ShiftManagement.css";

function toMinutes(time) {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) {
    return NaN;
  }

  const [hours, minutes] = time.split(":").map(Number);

  if (hours > 23 || minutes > 59) {
    return NaN;
  }

  return hours * 60 + minutes;
}

function durationToMinutes(value) {
  if (!/^\d{2}:\d{2}$/.test(value)) {
    return NaN;
  }

  const [hours, minutes] = value.split(":").map(Number);

  if (minutes > 59 || hours > 24) {
    return NaN;
  }

  const total = hours * 60 + minutes;

  return total > 1440 ? NaN : total;
}

function formatDuration(minutes) {
  if (!Number.isFinite(minutes) || minutes < 0) {
    return "";
  }

  return (
    String(Math.floor(minutes / 60)).padStart(2, "0") +
    ":" +
    String(minutes % 60).padStart(2, "0")
  );
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
    breaks: [],
  };
}

function calculateShiftHours(form) {
  const start = toMinutes(form.startTime);
  const end = toMinutes(form.endTime);

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return { error: "Enter shift start and end times." };
  }

  if (end <= start) {
    return { error: "Shift end must be after shift start." };
  }

  const shiftDuration = end - start;

  let breakMinutes = 0;

  const sortedBreaks = [...form.breaks].sort(
    (a, b) => toMinutes(a.start) - toMinutes(b.start)
  );

  let previousEnd = start;

  for (const item of sortedBreaks) {
    const breakStart = toMinutes(item.start);
    const breakEnd = toMinutes(item.end);

    if (!item.name.trim()) {
      return { error: "Enter a name for every break." };
    }

    if (
      !Number.isFinite(breakStart) ||
      !Number.isFinite(breakEnd)
    ) {
      return { error: "Enter all break timings." };
    }

    if (breakEnd <= breakStart) {
      return {
        error: `${item.name}: End must be after start.`,
      };
    }

    if (breakStart < start || breakEnd > end) {
      return {
        error: `${item.name}: Break must be inside the shift.`,
      };
    }

    if (breakStart < previousEnd) {
      return { error: "Break timings cannot overlap." };
    }

    breakMinutes += breakEnd - breakStart;
    previousEnd = breakEnd;
  }

  const expectedMinutes = shiftDuration - breakMinutes;

  if (expectedMinutes <= 0) {
    return {
      error: "Expected working hours must be greater than zero.",
    };
  }

  return {
    shiftDuration,
    breakMinutes,
    expectedMinutes,
    breaks: sortedBreaks,
    error: "",
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
  const shiftPreview = calculateShiftHours(form);

  function addBreak() {
    setForm((current) => ({
      ...current,
      breaks: [
        ...current.breaks,
        {
          id: crypto.randomUUID(),
          name: "",
          start: "",
          end: "",
        },
      ],
    }));

    setError("");
  }

  function updateBreak(id, field, value) {
    setForm((current) => ({
      ...current,
      breaks: current.breaks.map((item) =>
        item.id === id
          ? { ...item, [field]: value }
          : item
      ),
    }));

    setError("");
  }

  function removeBreak(id) {
    setForm((current) => ({
      ...current,
      breaks: current.breaks.filter(
        (item) => item.id !== id
      ),
    }));

    setError("");
  }

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
        (shift) =>
          shift.name.toLowerCase() === name.toLowerCase()
      )
    ) {
      setError("A shift with this name already exists.");
      return;
    }

    let expectedMinutes;
    let allowedBreakMinutes = null;
    let shiftBreaks = [];

    if (form.type === "Fixed") {
      const result = calculateShiftHours(form);

      if (result.error) {
        setError(result.error);
        return;
      }

      expectedMinutes = result.expectedMinutes;
      allowedBreakMinutes = result.breakMinutes;
      shiftBreaks = result.breaks;
    } else {
      expectedMinutes = durationToMinutes(
        form.expectedHours
      );

      if (
        !Number.isFinite(expectedMinutes) ||
        expectedMinutes <= 0 ||
        expectedMinutes > 1440
      ) {
        setError(
          "Enter valid working hours in HH:MM format."
        );
        return;
      }
    }

    const newShift = {
      id: crypto.randomUUID(),
      name,
      type: form.type,

      startTime:
        form.type === "Fixed" ? form.startTime : "",

      endTime:
        form.type === "Fixed" ? form.endTime : "",

      expectedMinutes,
      allowedBreakMinutes,
      breaks: shiftBreaks,
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
            Configure working timings and company-provided breaks.
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
                    <label htmlFor="shift-start">
                      Shift Start Time
                    </label>

                    <input
                      id="shift-start"
                      type="time"
                      name="startTime"
                      value={form.startTime}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="shift-field">
                    <label htmlFor="shift-end">
                      Shift End Time
                    </label>

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
            </div>

            {form.type === "Fixed" && (
              <>
                <div className="shift-break-section">

                  <div className="shift-break-heading">
                    <div>
                      <h3>Company-provided Breaks</h3>

                      <p className="shift-muted">
                        Add the breaks allowed during this shift.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="shift-secondary-btn"
                      onClick={addBreak}
                    >
                      + Add Break
                    </button>
                  </div>

                  {form.breaks.length === 0 && (
                    <div className="shift-no-breaks">
                      No breaks configured for this shift.
                    </div>
                  )}

                  {form.breaks.map((item, index) => (
                    <div
                      className="shift-break-row"
                      key={item.id}
                    >
                      <div className="shift-field">
                        <label>Break {index + 1} Name</label>

                        <input
                          aria-label={`Break ${index + 1} name`}
                          value={item.name}
                          placeholder="Example: Lunch"
                          onChange={(event) =>
                            updateBreak(
                              item.id,
                              "name",
                              event.target.value
                            )
                          }
                        />
                      </div>

                      <div className="shift-field">
                        <label>Break Out</label>

                        <input
                          aria-label={`Break ${index + 1} start`}
                          type="time"
                          value={item.start}
                          onChange={(event) =>
                            updateBreak(
                              item.id,
                              "start",
                              event.target.value
                            )
                          }
                        />
                      </div>

                      <div className="shift-field">
                        <label>Break In</label>

                        <input
                          aria-label={`Break ${index + 1} end`}
                          type="time"
                          value={item.end}
                          onChange={(event) =>
                            updateBreak(
                              item.id,
                              "end",
                              event.target.value
                            )
                          }
                        />
                      </div>

                      <div className="shift-field">
                        <label>Duration</label>

                        <input
                          type="text"
                          aria-label={`Break ${index + 1} duration`}
                          readOnly
                          value={
                            formatDuration(
                              toMinutes(item.end) -
                              toMinutes(item.start)
                            ) || "—"
                          }
                        />
                      </div>

                      <button
                        type="button"
                        className="shift-delete-btn"
                        onClick={() => removeBreak(item.id)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <div className="shift-calculation">

                  <div className="shift-field">
                    <label>Total Shift Duration</label>

                    <input
                      type="text"
                      aria-label="Total shift duration"
                      readOnly
                      value={
                        formatDuration(
                          shiftPreview.shiftDuration
                        ) || "—"
                      }
                    />
                  </div>

                  <div className="shift-field">
                    <label>Total Allowed Breaks</label>

                    <input
                      type="text"
                      aria-label="Total allowed breaks"
                      readOnly
                      value={
                        formatDuration(
                          shiftPreview.breakMinutes
                        ) || "—"
                      }
                    />
                  </div>

                  <div className="shift-field">
                    <label>Expected Working Hours</label>

                    <input
                      className="shift-calculated-hours"
                      aria-label="Expected working hours"
                      type="text"
                      readOnly
                      value={
                        formatDuration(
                          shiftPreview.expectedMinutes
                        ) || "—"
                      }
                    />

                    <small>Automatically calculated · HH:MM</small>
                  </div>
                </div>

                {shiftPreview.error &&
                  form.startTime &&
                  form.endTime && (
                    <p className="shift-muted">
                      {shiftPreview.error}
                    </p>
                  )}
              </>
            )}

            {form.type === "Flexible" && (
              <div className="shift-form-grid">
                <div className="shift-field">
                  <label htmlFor="shift-hours">
                    Expected Working Hours (HH:MM)
                  </label>

                  <input
                    id="shift-hours"
                    type="text"
                    name="expectedHours"
                    value={form.expectedHours}
                    onChange={handleChange}
                    placeholder="08:00"
                    maxLength={5}
                  />

                  <small>
                    Enter duration, not AM or PM.
                  </small>
                </div>
              </div>
            )}

            {error && (
              <p className="shift-error" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="shift-primary-btn"
            >
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
                <th>Allowed Breaks</th>
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
                    <td>
                      {shift.type === "Fixed" ? (
                        <div className="shift-break-summary">
                          <strong>
                            {formatDuration(
                              shift.allowedBreakMinutes ??
                              (
                                toMinutes(shift.endTime) -
                                toMinutes(shift.startTime) -
                                shift.expectedMinutes
                              )
                            )}
                          </strong>

                          <small>
                            {Array.isArray(shift.breaks)
                              ? `${shift.breaks.length} configured breaks`
                              : "Legacy configuration"}
                          </small>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td>{formatDuration(shift.expectedMinutes)}</td>
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
                  <td colSpan="7" className="shift-empty">
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
