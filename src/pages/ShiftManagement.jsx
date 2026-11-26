
import { useState } from "react";
import "./ShiftManagement.css";
import { getLocalDate, getAssignedShift as resolveShift, getAssignmentHistory, validateBulkAssignment } from "./shiftAssignment";
import { calculateWorkedMinutes } from "./attendanceUtils.js";

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
  const [selectedIds, setSelectedIds] = useState([]);
  const [effectiveFrom, setEffectiveFrom] = useState(getLocalDate);
  const [department, setDepartment] = useState("All");
  const [bulkSearch, setBulkSearch] = useState("");
  const [assignmentSuccess, setAssignmentSuccess] = useState("");
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

  function getAssignedShift(employeeId, date = getLocalDate()) {
    return resolveShift(employeeId, date, shifts, shiftAssignments);
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


  const departments = [...new Set(activeEmployees.map(e => e.department).filter(Boolean))];
  const eligible = activeEmployees.filter(e =>
    (department === "All" || e.department === department) &&
    `${e.id} ${e.name}`.toLowerCase().includes(bulkSearch.trim().toLowerCase())
  );
  const allSelected = eligible.length > 0 && eligible.every(e => selectedIds.includes(e.id));

  function toggleEmployee(id) {
    setSelectedIds(current => current.includes(id) ? current.filter(x => x !== id) : [...current, id]);
    setAssignmentError("");
    setAssignmentSuccess("");
  }

  function assignShift(event) {
    event.preventDefault();
    setAssignmentSuccess("");
    const errors = validateBulkAssignment({ employeeIds: selectedIds, employees, shiftId: assignmentShift, shifts, effectiveFrom, assignments: shiftAssignments, attendance });
    // Protect existing attendance affected by the new assignment, until the next scheduled shift.
    selectedIds.forEach(id => {
      const next = shiftAssignments.filter(a => a.employeeId === id && a.effectiveFrom > effectiveFrom).map(a => a.effectiveFrom).sort()[0];
      if (attendance.some(r => r.employeeId === id && r.date >= effectiveFrom && (!next || r.date < next))) {
        errors.push(`${id}: Existing attendance would be affected.`);
      }
    });
    if (errors.length) { setAssignmentError([...new Set(errors)].join("\n")); return; }
    const target = getShift(assignmentShift);
    const changes = selectedIds.map(id => `${id}: ${getAssignedShift(id, effectiveFrom)?.name || "Not Assigned"} → ${target.name}`);
    if (!window.confirm(`Assign ${selectedIds.length} employee(s) from ${effectiveFrom}?\n${changes.join("\n")}`)) return;
    const additions = selectedIds.map(employeeId => ({ id: crypto.randomUUID(), employeeId, shiftId: assignmentShift, effectiveFrom }));
    setShiftAssignments(current => [...current, ...additions]);
    setAssignmentSuccess(`${additions.length} employee(s) assigned successfully.`);
    setSelectedIds([]);
    setAssignmentError("");
  }

  function deleteShift(id) {
    const isAssigned = shiftAssignments.some(item => item.shiftId === id) || attendance.some(record => record.shiftSnapshot?.id === id);

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
                const count = activeEmployees.filter(employee => getAssignedShift(employee.id)?.id === shift.id).length;

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
        <h3>Bulk Shift Assignment</h3>
        <p className="shift-muted">Select a shift, effective date and active employees. Previous assignments are retained.</p>
        <form onSubmit={assignShift}>
          <div className="shift-assignment-grid">
            <div className="shift-field"><label htmlFor="assign-shift">Target shift</label><select id="assign-shift" value={assignmentShift} onChange={e => { setAssignmentShift(e.target.value); setAssignmentError(""); setAssignmentSuccess(""); }}><option value="">Select shift</option>{shifts.map(shift => <option key={shift.id} value={shift.id}>{shift.name} ({shift.type})</option>)}</select></div>
            <div className="shift-field"><label htmlFor="effective-date">Effective date</label><input id="effective-date" type="date" min={getLocalDate()} value={effectiveFrom} onChange={e => { setEffectiveFrom(e.target.value); setAssignmentError(""); setAssignmentSuccess(""); }} /></div>
          </div>
          <div className="shift-assignment-grid">
            <div className="shift-field"><label htmlFor="bulk-search">Search employees</label><input id="bulk-search" value={bulkSearch} onChange={e => setBulkSearch(e.target.value)} /></div>
            <div className="shift-field"><label htmlFor="bulk-department">Department</label><select id="bulk-department" value={department} onChange={e => setDepartment(e.target.value)}><option value="All">All departments</option>{departments.map(d => <option key={d}>{d}</option>)}</select></div>
          </div>
          <label><input type="checkbox" checked={allSelected} disabled={!eligible.length} onChange={() => { setSelectedIds(current => allSelected ? current.filter(id => !eligible.some(e => e.id === id)) : [...new Set([...current, ...eligible.map(e => e.id)])]); setAssignmentError(""); setAssignmentSuccess(""); }} /> Select all filtered employees</label>
          <div className="shift-table-scroll"><table className="shift-table"><thead><tr><th>Select</th><th>Employee</th><th>Department</th><th>Current shift</th><th>Shift on effective date</th></tr></thead><tbody>{eligible.map(e => <tr key={e.id}><td><input type="checkbox" aria-label={`Select ${e.name}`} checked={selectedIds.includes(e.id)} onChange={() => toggleEmployee(e.id)} /></td><td>{e.name} · {e.id}</td><td>{e.department}</td><td>{getAssignedShift(e.id)?.name || "Not Assigned"}</td><td>{getAssignedShift(e.id, effectiveFrom)?.name || "Not Assigned"}</td></tr>)}{!eligible.length && <tr><td colSpan="5">No matching active employees.</td></tr>}</tbody></table></div>
          <div className="shift-cart">
            <h3>Selected Employees ({selectedIds.length})</h3>
            <button type="button" className="shift-delete-btn" onClick={() => { setSelectedIds([]); setAssignmentError(""); setAssignmentSuccess(""); }}>Clear all</button>
            {selectedIds.map(id => <div className="shift-cart-row" key={id}><span>{employees.find(e => e.id === id)?.name || id} · {getAssignedShift(id, effectiveFrom)?.name || "Not Assigned"} → {getShift(assignmentShift)?.name || "Select shift"}</span><button type="button" className="shift-delete-btn" onClick={() => toggleEmployee(id)}>Remove</button></div>)}
            <p>Effective from: {effectiveFrom || "—"}</p>
            <button type="submit" className="shift-primary-btn" disabled={!selectedIds.length || !assignmentShift || !effectiveFrom}>Review and Assign ({selectedIds.length})</button>
          </div>
          {assignmentError && <p className="shift-error" role="alert" style={{ whiteSpace: "pre-line" }}>{assignmentError}</p>}
          {assignmentSuccess && <p role="status">{assignmentSuccess}</p>}
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
                <th>Assignment History</th>
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
                      <details><summary>View history</summary>
                        {getAssignmentHistory(employee.id, shiftAssignments).map((item, index) => <p key={item.id || index}>{getShift(item.shiftId)?.name || "Unknown shift"} · {item.effectiveFrom || "Legacy assignment"} · {item.assignmentStatus}</p>)}
                        {!shiftAssignments.some(item => item.employeeId === employee.id) && <p>No assignments yet.</p>}
                      </details>
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
                const shift = record.shiftSnapshot || getAssignedShift(record.employeeId, record.date);
                const worked = calculateWorkedMinutes(record);

                const difference = shift && worked !== null
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
                      {worked !== null ? formatMinutes(worked) : record.status === "Absent" ? "Absent" : "Needs Review"}
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
