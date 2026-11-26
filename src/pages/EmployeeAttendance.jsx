
import { useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  CalendarDays,
  Fingerprint,
  RotateCcw,
  AlertCircle,
} from "lucide-react";

import {
  getToday,
  formatDuration,
  getEmployeeAttendance,
  getAttendanceActionOptions,
  getSuggestedAction,
  getSuggestedPunchTime,
  applyAttendanceAction,
  canUndoLastPunch,
  undoLastPunch,
  getPunchHistory,
  changeAttendanceDate,
} from "./attendanceUtils.js";

import "./EmployeeAttendance.css";

function EmployeeAttendance({
  employee,
  attendance = [],
  setAttendance,
  shifts = [],
  shiftAssignments = [],
  initialDate,
  onBack,
  onRequestCorrection,
}) {
  const [date, setDate] = useState(initialDate || getToday());
  const [simulationOpen, setSimulationOpen] = useState(false);
  const [action, setAction] = useState("");
  const [time, setTime] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const today = getToday();

  // Get attendance and shift details for the selected date
  const daily = getEmployeeAttendance(
    employee,
    date,
    attendance,
    shifts,
    shiftAssignments
  );

  const record = daily.record;
  const shift = daily.shift;

  const history = getPunchHistory(record, shift);

  const isActive = employee.status === "Active";

  const isBeforeJoining =
    employee.joiningDate && date < employee.joiningDate;

  const actions = getAttendanceActionOptions(record, shift);

  const canSimulate =
    isActive &&
    !isBeforeJoining &&
    date <= today &&
    Boolean(shift) &&
    actions.length > 0;

  const suggestedAction = getSuggestedAction(record, shift);

  const selectedAction =
    action ||
    (typeof suggestedAction === "string"
      ? suggestedAction
      : suggestedAction?.value) ||
    actions[0]?.value ||
    "";

  const selectedTime =
    time ||
    getSuggestedPunchTime(selectedAction, record, shift) ||
    "";

  const initials = employee.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  // Reset the form when changing the date
  function selectDate(newDate) {
    if (!newDate || newDate > today) {
      return;
    }

    setDate(newDate);
    setAction("");
    setTime("");
    setError("");
    setSuccess("");
    setSimulationOpen(false);
  }

  function selectAction(newAction) {
    setAction(newAction);

    setTime(
      getSuggestedPunchTime(newAction, record, shift) || ""
    );

    setError("");
    setSuccess("");
  }

  function openSimulation() {
    setSimulationOpen(true);
    setAction("");
    setTime("");
    setError("");
    setSuccess("");
  }

  // Save the simulated punch
  function savePunch(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!canSimulate) {
      setError("Attendance simulation is not available.");
      return;
    }

    if (!selectedAction) {
      setError("Select an attendance action.");
      return;
    }

    if (!selectedTime) {
      setError("Enter the punch time.");
      return;
    }

    try {
      const updatedRecord = applyAttendanceAction({
        employee,
        date,
        time: selectedTime,
        action: selectedAction,
        record,
        shift,
      });

      setAttendance((previous) => {
        const existingRecord = previous.find(
          (item) =>
            item.employeeId === employee.id &&
            item.date === date
        );

        // Do not overwrite a record that has already changed
        if (existingRecord !== (record || undefined)) {
          return previous;
        }

        if (existingRecord) {
          return previous.map((item) =>
            item.employeeId === employee.id &&
            item.date === date
              ? updatedRecord
              : item
          );
        }

        return [...previous, updatedRecord];
      });

      setSuccess(
        `${actions.find((item) => item.value === selectedAction)?.label ||
          selectedAction} recorded at ${selectedTime}.`
      );

      setAction("");
      setTime("");

      if (updatedRecord.checkOut) {
        setSimulationOpen(false);
      }
    } catch (err) {
      setError(err.message || "Unable to record attendance.");
    }
  }

  // Undo only the latest unfinished simulated punch
  function handleUndo() {
    setError("");
    setSuccess("");

    if (!canUndoLastPunch(record)) {
      setError("This punch cannot be undone.");
      return;
    }

    const confirmed = window.confirm(
      "Do you want to undo the latest simulated punch?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const updatedRecord = undoLastPunch(record);

      setAttendance((previous) => {
        const existingRecord = previous.find(
          (item) =>
            item.employeeId === employee.id &&
            item.date === date
        );

        if (existingRecord !== record) {
          return previous;
        }

        if (!updatedRecord) {
          return previous.filter(
            (item) =>
              !(
                item.employeeId === employee.id &&
                item.date === date
              )
          );
        }

        return previous.map((item) =>
          item.employeeId === employee.id &&
          item.date === date
            ? updatedRecord
            : item
        );
      });

      setAction("");
      setTime("");
      setSuccess("Latest simulated punch undone.");
    } catch (err) {
      setError(err.message || "Unable to undo the punch.");
    }
  }

  function getStatusClass(status) {
    switch (status) {
      case "Present":
      case "Recorded":
      case "Active":
        return "ea-status-success";

      case "Working":
      case "On Break":
      case "Pending":
        return "ea-status-warning";

      case "Absent":
      case "Inactive":
      case "Needs Review":
        return "ea-status-danger";

      default:
        return "ea-status-neutral";
    }
  }

  const summaryItems = [
    {
      label: "Expected Working Hours",
      value: formatDuration(daily.expectedMinutes),
    },
    {
      label: "Actual Working Hours",
      value: formatDuration(daily.workedMinutes),
    },
    {
      label: "Allowed Break Duration",
      value: formatDuration(daily.allowedBreakMinutes),
    },
    {
      label: "Actual Break Duration",
      value: formatDuration(daily.actualBreakMinutes),
    },
    {
      label: "Automatic Overtime",
      value: formatDuration(daily.overtimeMinutes),
    },
    {
      label: "Working Hours Shortage",
      value: formatDuration(daily.shortageMinutes),
    },
  ];

  const overtimeDetails = daily.overtimeDetails;

  return (
    <div className="ea-page">

      {/* Page heading */}

      <div className="ea-heading">
        <button
          type="button"
          className="ea-back-btn"
          onClick={onBack}
        >
          <ArrowLeft size={18} />
          Back to Employees
        </button>

        <div>
          <h1>Employee Attendance</h1>
          <p>
            View attendance, punch history and working hours.
          </p>
        </div>
      </div>

      {/* Employee details */}

      <div className="ea-employee-card">
        <div className="ea-employee-info">

          <div className="ea-avatar">
            {initials}
          </div>

          <div>
            <h2>{employee.name}</h2>

            <p>
              {employee.id} | {employee.department}
            </p>

            <p>{employee.designation}</p>
          </div>

          <span
            className={`ea-status ${getStatusClass(
              employee.status
            )}`}
          >
            {employee.status}
          </span>

        </div>

        <div className="ea-shift-info">
          <div>
            <span>Assigned Shift</span>
            <strong>
              {shift?.name || "Not Assigned"}
            </strong>
          </div>

          <div>
            <span>Shift Type</span>
            <strong>
              {shift?.type || "—"}
            </strong>
          </div>

          <div>
            <span>Shift Timing</span>
            <strong>
              {shift?.startTime && shift?.endTime
                ? `${shift.startTime} - ${shift.endTime}`
                : "—"}
            </strong>
          </div>

          <div>
            <span>Expected Hours</span>
            <strong>
              {formatDuration(daily.expectedMinutes)}
            </strong>
          </div>
        </div>
      </div>

      {/* Attendance date */}

      <div className="ea-date-bar">

        <div className="ea-date-label">
          <CalendarDays size={20} />
          <strong>Attendance Date</strong>
        </div>

        <div className="ea-date-controls">

          <button
            type="button"
            className="ea-icon-btn"
            title="Previous day"
            onClick={() =>
              selectDate(changeAttendanceDate(date, -1))
            }
          >
            <ChevronLeft size={18} />
          </button>

          <input
            type="date"
            value={date}
            max={today}
            onChange={(event) =>
              selectDate(event.target.value)
            }
          />

          <button
            type="button"
            className="ea-icon-btn"
            title="Next day"
            disabled={date >= today}
            onClick={() =>
              selectDate(changeAttendanceDate(date, 1))
            }
          >
            <ChevronRight size={18} />
          </button>

          <button
            type="button"
            className="ea-secondary-btn"
            onClick={() => selectDate(today)}
          >
            Today
          </button>

        </div>

        <span
          className={`ea-status ${getStatusClass(
            daily.attendanceStatus
          )}`}
        >
          {daily.attendanceStatus}
        </span>

      </div>

      {/* Attendance warnings */}

      {!isActive && (
        <div className="ea-notice">
          <AlertCircle size={18} />
          This employee is inactive. Historical attendance
          is available in read-only mode.
        </div>
      )}

      {isBeforeJoining && (
        <div className="ea-notice">
          <AlertCircle size={18} />
          The selected date is before the employee's
          joining date.
        </div>
      )}

      {!shift && !isBeforeJoining && (
        <div className="ea-notice">
          <AlertCircle size={18} />
          No shift is assigned for the selected date.
          Assign a shift before recording attendance.
        </div>
      )}

      {daily.attendanceStatus === "Needs Review" && (
        <div className="ea-notice">
          <AlertCircle size={18} />
          This attendance record is incomplete or invalid.
          Review the punch history before processing payroll.
        </div>
      )}

      {/* Attendance summary */}

      <div className="ea-section">
        <div className="ea-section-heading">
          <h3>Attendance Summary</h3>
          <p>All durations are displayed in HH:MM format.</p>
        </div>

        <div className="ea-summary-grid">
          {summaryItems.map((item) => (
            <div
              className="ea-summary-card"
              key={item.label}
            >
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* Overtime calculation breakdown */}

      {overtimeDetails && (
        <div className="ea-section">

          <div className="ea-section-heading">
            <h3>Overtime Calculation</h3>
            <p>
              Overtime is calculated automatically using
              actual attendance and the assigned shift.
            </p>
          </div>

          <div className="ea-breakdown">

            <div>
              <span>Early Arrival</span>
              <strong>
                + {formatDuration(
                  overtimeDetails.earlyArrival
                )}
              </strong>
            </div>

            <div>
              <span>Late Departure</span>
              <strong>
                + {formatDuration(
                  overtimeDetails.lateDeparture
                )}
              </strong>
            </div>

            <div>
              <span>Late Arrival</span>
              <strong>
                - {formatDuration(
                  overtimeDetails.lateArrival
                )}
              </strong>
            </div>

            <div>
              <span>Early Departure</span>
              <strong>
                - {formatDuration(
                  overtimeDetails.earlyDeparture
                )}
              </strong>
            </div>

            <div>
              <span>Excess Break Duration</span>
              <strong>
                - {formatDuration(
                  overtimeDetails.excessBreak
                )}
              </strong>
            </div>

            <div>
              <span>Final Overtime</span>
              <strong>
                {formatDuration(
                  overtimeDetails.overtimeMinutes
                )}
              </strong>
            </div>

          </div>

        </div>
      )}

      {/* Punch history */}

      <div className="ea-section">

        <div className="ea-section-heading">
          <h3>Punch History</h3>
          <p>
            Compare scheduled timings with recorded punches.
          </p>
        </div>

        <div className="ea-last-punch">
          <Clock size={18} />

          <span>Last recorded punch:</span>

          <strong>
            {daily.lastPunch
              ? `${daily.lastPunch.action} at ${daily.lastPunch.time}`
              : "No punches recorded"}
          </strong>
        </div>

        <div className="ea-table-scroll">
          <table className="ea-table">

            <thead>
              <tr>
                <th>Attendance Event</th>
                <th>Scheduled Time</th>
                <th>Actual Time</th>
                <th>Source</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>

              {history.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    No punch history available.
                  </td>
                </tr>
              ) : (
                history.map((item, index) => (
                  <tr key={item.id || index}>

                    <td>{item.event}</td>

                    <td>
                      {item.scheduled || "—"}
                    </td>

                    <td>
                      <strong>
                        {item.actual || "—"}
                      </strong>
                    </td>

                    <td>
                      {item.source || "—"}
                    </td>

                    <td>
                      <span
                        className={`ea-status ${getStatusClass(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </td>

                  </tr>
                ))
              )}

            </tbody>
          </table>
        </div>
      </div>

      {/* Demo attendance simulation */}

      <div className="ea-section">

        <div className="ea-section-heading">
          <h3>Attendance Simulation</h3>

          <p>
            For development and testing only.
            Actual biometric records cannot be edited here.
          </p>
        </div>

        {!simulationOpen && canSimulate && (
          <button
            type="button"
            className="ea-primary-btn"
            onClick={openSimulation}
          >
            <Fingerprint size={18} />
            Open Punch Simulation
          </button>
        )}

        {simulationOpen && canSimulate && (

          <form
            className="ea-simulation-form"
            onSubmit={savePunch}
          >

            <div className="ea-form-grid">

              <div className="ea-field">

                <label>Attendance Action</label>

                <select
                  value={selectedAction}
                  onChange={(event) =>
                    selectAction(event.target.value)
                  }
                  required
                >
                  {actions.map((item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                    </option>
                  ))}
                </select>

              </div>

              <div className="ea-field">

                <label>Punch Time (24-hour)</label>

                <input
                  type="text"
                  value={selectedTime}
                  placeholder="HH:MM"
                  maxLength={5}
                  pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
                  onChange={(event) => {
                    setTime(event.target.value);
                    setError("");
                    setSuccess("");
                  }}
                  required
                />

                <small>
                  Enter the time in 24-hour HH:MM format.
                </small>

              </div>

            </div>

            {daily.lastPunch && (
              <div className="ea-notice">
                <Clock size={16} />

                Previous punch: {daily.lastPunch.action}
                {" at "}
                {daily.lastPunch.time}.
                The next punch must be after this time.
              </div>
            )}

            <div className="ea-form-actions">

              <button
                type="submit"
                className="ea-primary-btn"
              >
                <Fingerprint size={17} />
                Record Punch
              </button>

              {canUndoLastPunch(record) && (
                <button
                  type="button"
                  className="ea-secondary-btn"
                  onClick={handleUndo}
                >
                  <RotateCcw size={16} />
                  Undo Last Punch
                </button>
              )}

              <button
                type="button"
                className="ea-secondary-btn"
                onClick={() => {
                  setSimulationOpen(false);
                  setError("");
                }}
              >
                Close Simulation
              </button>

            </div>

          </form>
        )}

        {!simulationOpen &&
          isActive &&
          canUndoLastPunch(record) && (
            <button
              type="button"
              className="ea-secondary-btn"
              onClick={handleUndo}
            >
              <RotateCcw size={16} />
              Undo Last Punch
            </button>
          )}

        {record?.checkOut && (
          <div className="ea-notice">
            Attendance is completed for this date.
            Further changes require an approved correction.
          </div>
        )}

        {record &&
          record.source !== "Individual Punch Simulation" &&
          !record.checkOut && (
            <div className="ea-notice">
              Imported attendance records are read-only.
              Use attendance correction for any changes.
            </div>
          )}

        {error && (
          <div className="ea-error" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="ea-success" role="status">
            {success}
          </div>
        )}

      </div>

      {/* Attendance correction */}

      {record &&
        isActive &&
        !canUndoLastPunch(record) && (
          <div className="ea-section">

            <div className="ea-section-heading">
              <h3>Attendance Correction</h3>

              <p>
                Incorrect or missing attendance punches
                require a correction request and approval.
              </p>
            </div>

            <button
              type="button"
              className="ea-secondary-btn"
              disabled={!onRequestCorrection}
              onClick={() =>
                onRequestCorrection(employee.id, date)
              }
            >
              Request Correction
            </button>

          </div>
        )}

    </div>
  );
}

export default EmployeeAttendance;
