
import { useState } from "react";
import "./AttendanceManagement.css";

const DEFAULT_SCHEDULE = {
  punchIn: "09:00",
  morningOut: "11:00",
  morningIn: "11:15",
  lunchOut: "13:00",
  lunchIn: "14:00",
  afternoonOut: "15:00",
  afternoonIn: "15:15",
  punchOut: "18:00",
};

const EVENT_FIELDS = [
  ["punchIn", "Punch In"],
  ["morningOut", "Break Out"],
  ["morningIn", "Break In"],
  ["lunchOut", "Lunch Out"],
  ["lunchIn", "Lunch In"],
  ["afternoonOut", "Break Out"],
  ["afternoonIn", "Break In"],
  ["punchOut", "Punch Out"],
];

function toMinutes(time) {
  if (!time) return NaN;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatMinutes(minutes) {
  const value = Math.max(0, minutes);
  const hours = Math.floor(value / 60);
  const mins = value % 60;
  return `${hours}h ${String(mins).padStart(2, "0")}m`;
}

function timeFromMinutes(minutes) {
  return (
    String(Math.floor(minutes / 60)).padStart(2, "0") +
    ":" +
    String(minutes % 60).padStart(2, "0")
  );
}

function today() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function makeId() {
  return crypto.randomUUID();
}

function getBreaks(schedule) {
  return [
    {
      start: schedule.morningOut,
      end: schedule.morningIn,
    },
    {
      start: schedule.lunchOut,
      end: schedule.lunchIn,
    },
    {
      start: schedule.afternoonOut,
      end: schedule.afternoonIn,
    },
  ];
}

function workedMinutes(record) {
  if (record.status !== "Present") return 0;

  const total =
    toMinutes(record.checkOut) - toMinutes(record.checkIn);

  const breaks = (record.breaks || []).reduce(
    (sum, item) =>
      sum + toMinutes(item.end) - toMinutes(item.start),
    0
  );

  return total - breaks;
}

function snapshot(record) {
  return JSON.stringify({
    status: record.status,
    checkIn: record.checkIn,
    checkOut: record.checkOut,
    breaks: (record.breaks || []).map((item) => ({
      start: item.start,
      end: item.end,
    })),
  });
}

function validSchedule(schedule) {
  const values = EVENT_FIELDS.map(([field]) =>
    toMinutes(schedule[field])
  );

  if (values.some((value) => !Number.isFinite(value))) {
    return false;
  }

  return values.every(
    (value, index) =>
      index === 0 || value > values[index - 1]
  );
}

function validAttendance(record) {
  if (record.status === "Absent") return true;

  if (!record.checkIn || !record.checkOut) return false;

  const start = toMinutes(record.checkIn);
  const end = toMinutes(record.checkOut);

  if (!(end > start)) return false;

  let previous = start;

  for (const item of record.breaks || []) {
    const breakStart = toMinutes(item.start);
    const breakEnd = toMinutes(item.end);

    if (
      !Number.isFinite(breakStart) ||
      !Number.isFinite(breakEnd) ||
      breakStart < previous ||
      breakEnd <= breakStart ||
      breakEnd > end
    ) {
      return false;
    }

    previous = breakEnd;
  }

  return workedMinutes(record) > 0;
}

function AttendanceManagement({
  employees,
  attendance,
  setAttendance,
  correctionRequests,
  setCorrectionRequests,
  shifts = [],
  shiftAssignments = [],
  overtimeRequests = [],
  setOvertimeRequests,
}) {
  const [schedule, setSchedule] =
    useState(DEFAULT_SCHEDULE);

  const [date, setDate] = useState(today());
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("records");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const [selectedRecordId, setSelectedRecordId] =
    useState(null);

  const [correctionId, setCorrectionId] = useState(null);
  const [correctionStatus, setCorrectionStatus] =
    useState("Present");
  const [correctedIn, setCorrectedIn] = useState("");
  const [correctedOut, setCorrectedOut] = useState("");
  const [correctionReason, setCorrectionReason] =
    useState("");

  const [reviewId, setReviewId] = useState(null);
  const [reviewNote, setReviewNote] = useState("");

  const activeEmployees = employees.filter(
    (employee) => employee.status === "Active"
  );

  function getEmployee(id) {
    return employees.find((employee) => employee.id === id);
  }

  function getShift(employeeId) {
    const assignment = shiftAssignments.find(
      (item) => item.employeeId === employeeId
    );

    return shifts.find(
      (shift) => shift.id === assignment?.shiftId
    );
  }

  function simulateImport() {
    setError("");
    setResult(null);

    if (!date || date > today()) {
      setError("Choose today or an earlier date.");
      return;
    }

    if (!validSchedule(schedule)) {
      setError("Schedule timings must be in the correct order.");
      return;
    }

    if (typeof setOvertimeRequests !== "function") {
      setError(
        "Overtime state is not connected in App.jsx."
      );
      return;
    }

    const existing = new Set(
      attendance.map(
        (item) => `${item.employeeId}|${item.date}`
      )
    );

    const newRecords = [];
    const newOT = [];
    const exceptions = [];

    activeEmployees.forEach((employee, index) => {
      const key = `${employee.id}|${date}`;

      if (existing.has(key)) {
        exceptions.push({
          name: employee.name,
          message: "Attendance already imported",
        });
        return;
      }

      const shift = getShift(employee.id);

      if (!shift) {
        exceptions.push({
          name: employee.name,
          message: "Shift not assigned",
        });
        return;
      }

      // Demo only: every third employee works 1 extra hour.
      const extra = index % 3 === 0 ? 60 : 0;

      const punchOutMinutes =
        toMinutes(schedule.punchOut) + extra;

      if (punchOutMinutes >= 1440) {
        exceptions.push({
          name: employee.name,
          message: "Punch-out exceeds same-day limit",
        });
        return;
      }

      const record = {
        id: makeId(),
        employeeId: employee.id,
        date,
        status: "Present",
        checkIn: schedule.punchIn,
        checkOut: timeFromMinutes(punchOutMinutes),
        breaks: getBreaks(schedule),
        source: "Biometric Simulation",
      };

      if (!validAttendance(record)) {
        exceptions.push({
          name: employee.name,
          message: "Invalid punch sequence",
        });
        return;
      }

      newRecords.push(record);
      existing.add(key);

      const worked = workedMinutes(record);

      const eligible = Math.max(
        0,
        worked - shift.expectedMinutes
      );

      if (eligible > 0) {
        newOT.push({
          id: makeId(),
          attendanceId: record.id,
          employeeId: employee.id,
          employeeName: employee.name,
          date,
          shiftId: shift.id,
          shiftName: shift.name,
          expectedMinutes: shift.expectedMinutes,
          workedMinutes: worked,
          eligibleMinutes: eligible,
          requestedMinutes: eligible,
          attendanceSnapshot: snapshot(record),
          reason: "Automatically detected from biometric attendance",
          status: "Pending",
          requestedAt: new Date().toISOString(),
          reviewedAt: null,
          reviewedBy: null,
          reviewNote: "",
          source: "Automatic Biometric OT",
        });
      }
    });

    if (newRecords.length) {
      setAttendance((current) => [
        ...current,
        ...newRecords,
      ]);
    }

    if (newOT.length) {
      setOvertimeRequests((current) => [
        ...current,
        ...newOT,
      ]);
    }

    setResult({
      imported: newRecords.length,
      overtime: newOT.length,
      exceptions,
    });
  }

  function openCorrection(record) {
    setCorrectionId(record.id);
    setCorrectionStatus(record.status);
    setCorrectedIn(record.checkIn || "");
    setCorrectedOut(record.checkOut || "");
    setCorrectionReason("");
    setError("");
  }

  function submitCorrection() {
    const original = attendance.find(
      (record) => record.id === correctionId
    );

    if (!original) return;

    const alreadyPending = correctionRequests.some(
      (request) =>
        request.attendanceId === correctionId &&
        request.status === "Pending"
    );

    if (alreadyPending) {
      setError("A correction is already pending.");
      return;
    }

    if (!correctionReason.trim()) {
      setError("Enter a correction reason.");
      return;
    }

    const proposed = {
      ...original,
      status: correctionStatus,
      checkIn:
        correctionStatus === "Present"
          ? correctedIn
          : "",
      checkOut:
        correctionStatus === "Present"
          ? correctedOut
          : "",
      breaks:
        correctionStatus === "Present"
          ? (original.breaks || []).map((item) => ({
              ...item,
            }))
          : [],
    };

    if (!validAttendance(proposed)) {
      setError(
        "Corrected punches are invalid. Breaks must remain inside the working period."
      );
      return;
    }

    setCorrectionRequests((current) => [
      ...current,
      {
        id: makeId(),
        attendanceId: original.id,
        employeeId: original.employeeId,
        date: original.date,
        original: {
          status: original.status,
          checkIn: original.checkIn,
          checkOut: original.checkOut,
          breaks: original.breaks,
        },
        proposed: {
          status: proposed.status,
          checkIn: proposed.checkIn,
          checkOut: proposed.checkOut,
          breaks: proposed.breaks,
        },
        originalSnapshot: snapshot(original),
        reason: correctionReason.trim(),
        status: "Pending",
        requestedAt: new Date().toISOString(),
        reviewedAt: null,
        reviewNote: "",
      },
    ]);

    setCorrectionId(null);
    setError("");
  }

  function reviewCorrection(decision) {
    const request = correctionRequests.find(
      (item) => item.id === reviewId
    );

    if (!request || !reviewNote.trim()) {
      setError("A review note is required.");
      return;
    }

    const original = attendance.find(
      (item) => item.id === request.attendanceId
    );

    if (decision === "Approved") {
      if (
        !original ||
        snapshot(original) !== request.originalSnapshot
      ) {
        setError(
          "Attendance changed after the request. Review the latest record first."
        );
        return;
      }

      setAttendance((current) =>
        current.map((record) =>
          record.id === request.attendanceId
            ? {
                ...record,
                ...request.proposed,
                source: "Approved Biometric Correction",
              }
            : record
        )
      );

      // Any OT generated from the old punches needs
      // another review before payroll.
      if (typeof setOvertimeRequests === "function") {
        setOvertimeRequests((current) =>
          current.map((item) =>
            item.attendanceId === request.attendanceId &&
            item.status === "Pending"
              ? {
                  ...item,
                  status: "Needs Review",
                  reviewNote:
                    "Attendance was corrected after OT generation",
                }
              : item
          )
        );
      }
    }

    setCorrectionRequests((current) =>
      current.map((item) =>
        item.id === reviewId
          ? {
              ...item,
              status: decision,
              reviewedAt: new Date().toISOString(),
              reviewedBy: "Super Admin (Demo)",
              reviewNote: reviewNote.trim(),
            }
          : item
      )
    );

    setReviewId(null);
    setReviewNote("");
    setError("");
  }

  const filteredRecords = attendance
    .filter((record) => {
      const employee = getEmployee(record.employeeId);
      const query = search.toLowerCase();

      return (
        employee?.name.toLowerCase().includes(query) ||
        record.employeeId.toLowerCase().includes(query) ||
        record.date.includes(query)
      );
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const selectedRecord = attendance.find(
    (record) => record.id === selectedRecordId
  );

  const selectedCorrection = correctionRequests.find(
    (request) => request.id === reviewId
  );

  const pendingCorrections = correctionRequests.filter(
    (request) => request.status === "Pending"
  );

  const exampleWorked = validSchedule(schedule)
    ? toMinutes(schedule.punchOut) -
      toMinutes(schedule.punchIn) -
      getBreaks(schedule).reduce(
        (sum, item) =>
          sum + toMinutes(item.end) - toMinutes(item.start),
        0
      )
    : null;

  return (
    <div className="attendance-page">
      <div className="attendance-title">
        <div>
          <h1>Attendance Management</h1>
          <p>
            Biometric attendance, working hours and
            correction approvals.
          </p>
        </div>

        <span className="attendance-demo">
          Simulation Mode
        </span>
      </div>

      <div className="attendance-alert">
        Attendance timings are received from biometric
        punches. Manual attendance and manual break entry
        are disabled. The device is not connected yet.
      </div>

      <div className="attendance-stats">
        <div>
          <span>Active Employees</span>
          <strong>{activeEmployees.length}</strong>
        </div>
        <div>
          <span>Attendance Records</span>
          <strong>{attendance.length}</strong>
        </div>
        <div>
          <span>Pending Corrections</span>
          <strong>{pendingCorrections.length}</strong>
        </div>
        <div>
          <span>Pending Overtime</span>
          <strong>
            {overtimeRequests.filter(
              (item) => item.status === "Pending"
            ).length}
          </strong>
        </div>
      </div>

      <div className="attendance-tabs">
        <button
          className={tab === "records" ? "selected" : ""}
          onClick={() => setTab("records")}
        >
          Attendance Records
        </button>

        <button
          className={tab === "simulation" ? "selected" : ""}
          onClick={() => setTab("simulation")}
        >
          Device Simulation
        </button>

        <button
          className={tab === "corrections" ? "selected" : ""}
          onClick={() => setTab("corrections")}
        >
          Correction Approvals ({pendingCorrections.length})
        </button>
      </div>

      {error && (
        <p className="attendance-error" role="alert">
          {error}
        </p>
      )}

      {tab === "records" && (
        <div className="attendance-card">
          <div className="attendance-card-heading">
            <h3>Employee Attendance</h3>
            <input
              placeholder="Search employee, ID or date..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <div className="attendance-table-wrap">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Punch In</th>
                  <th>Punch Out</th>
                  <th>Net Hours</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredRecords.map((record) => {
                  const employee = getEmployee(
                    record.employeeId
                  );

                  return (
                    <tr key={record.id}>
                      <td>
                        <strong>{employee?.name || "Unknown"}</strong>
                        <small>{record.employeeId}</small>
                      </td>
                      <td>{record.date}</td>
                      <td>
                        <span
                          className={
                            record.status === "Present"
                              ? "attendance-status present"
                              : "attendance-status absent"
                          }
                        >
                          {record.status}
                        </span>
                      </td>
                      <td>{record.checkIn || "—"}</td>
                      <td>{record.checkOut || "—"}</td>
                      <td>
                        {formatMinutes(
                          workedMinutes(record)
                        )}
                      </td>
                      <td>
                        <div className="attendance-actions">
                          <button
                            onClick={() =>
                              setSelectedRecordId(record.id)
                            }
                          >
                            View
                          </button>
                          <button
                            onClick={() =>
                              openCorrection(record)
                            }
                          >
                            Correction
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredRecords.length === 0 && (
                  <tr>
                    <td colSpan="7" className="attendance-empty">
                      No attendance records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "simulation" && (
        <>
          <div className="attendance-card">
            <h3>Example Working Schedule</h3>
            <p className="attendance-muted">
              These are temporary client-configurable
              example timings, not actual biometric data.
            </p>

            <div className="attendance-time-grid">
              {EVENT_FIELDS.map(([field, label], index) => (
                <label key={field}>
                  <span>
                    {label}
                    {(index === 1 || index === 2) &&
                      " (Morning)"}
                    {(index === 5 || index === 6) &&
                      " (Afternoon)"}
                  </span>
                  <input
                    type="time"
                    value={schedule[field]}
                    onChange={(event) => {
                      setSchedule((current) => ({
                        ...current,
                        [field]: event.target.value,
                      }));
                      setError("");
                    }}
                  />
                </label>
              ))}
            </div>

            <div className="attendance-worked">
              <span>Expected Net Working Hours</span>
              <strong>
                {exampleWorked === null
                  ? "Invalid Schedule"
                  : formatMinutes(exampleWorked)}
              </strong>
            </div>
          </div>

          <div className="attendance-card">
            <h3>Simulate Biometric Data Import</h3>
            <p className="attendance-muted">
              Imports example attendance for all active
              employees with assigned shifts. Every third
              employee receives one extra working hour
              to demonstrate automatic overtime detection.
            </p>

            <div className="attendance-import">
              <label>
                <span>Attendance Date</span>
                <input
                  type="date"
                  value={date}
                  max={today()}
                  onChange={(event) =>
                    setDate(event.target.value)
                  }
                />
              </label>

              <button
                className="attendance-primary"
                onClick={simulateImport}
              >
                Simulate Device Import
              </button>
            </div>

            {result && (
              <div className="attendance-results">
                <p>
                  <strong>{result.imported}</strong>{" "}
                  attendance records imported
                </p>
                <p>
                  <strong>{result.overtime}</strong>{" "}
                  overtime candidates generated
                </p>
                <p>
                  <strong>{result.exceptions.length}</strong>{" "}
                  exceptions
                </p>

                {result.exceptions.map((item, index) => (
                  <p key={index} className="attendance-warning">
                    {item.name}: {item.message}
                  </p>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === "corrections" && (
        <div className="attendance-card">
          <h3>Attendance Correction Requests</h3>
          <p className="attendance-muted">
            Demo Super Admin review. Corrections do not
            change attendance until approved.
          </p>

          <div className="attendance-table-wrap">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {correctionRequests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      {getEmployee(request.employeeId)?.name}
                    </td>
                    <td>{request.date}</td>
                    <td>{request.reason}</td>
                    <td>{request.status}</td>
                    <td>
                      <button
                        className="attendance-link"
                        onClick={() => {
                          setReviewId(request.id);
                          setReviewNote("");
                          setError("");
                        }}
                      >
                        {request.status === "Pending"
                          ? "Review"
                          : "View"}
                      </button>
                    </td>
                  </tr>
                ))}

                {correctionRequests.length === 0 && (
                  <tr>
                    <td colSpan="5" className="attendance-empty">
                      No correction requests yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedRecord && (
        <div className="attendance-overlay">
          <div className="attendance-modal">
            <div className="attendance-modal-heading">
              <h3>Biometric Punch Timeline</h3>
              <button
                onClick={() => setSelectedRecordId(null)}
              >
                ✕
              </button>
            </div>

            <p className="attendance-muted">
              {getEmployee(selectedRecord.employeeId)?.name}
              {" · "}
              {selectedRecord.date}
            </p>

            <div className="attendance-timeline">
              {selectedRecord.status === "Present" ? (
                [
                  ["Punch In", selectedRecord.checkIn],
                  ...(selectedRecord.breaks || []).flatMap(
                    (item, index) => [
                      [
                        index === 1
                          ? "Lunch Out"
                          : "Break Out",
                        item.start,
                      ],
                      [
                        index === 1
                          ? "Lunch In"
                          : "Break In",
                        item.end,
                      ],
                    ]
                  ),
                  ["Punch Out", selectedRecord.checkOut],
                ].map(([label, time], index) => (
                  <div key={index}>
                    <span className="attendance-dot" />
                    <strong>{label}</strong>
                    <span>{time}</span>
                  </div>
                ))
              ) : (
                <p>No punches for this attendance record.</p>
              )}
            </div>

            <div className="attendance-worked">
              <span>Net Working Hours</span>
              <strong>
                {formatMinutes(
                  workedMinutes(selectedRecord)
                )}
              </strong>
            </div>

            <p className="attendance-muted">
              Source: {selectedRecord.source || "Existing Record"}
            </p>
          </div>
        </div>
      )}

      {correctionId && (
        <div className="attendance-overlay">
          <div className="attendance-modal">
            <div className="attendance-modal-heading">
              <h3>Request Attendance Correction</h3>
              <button
                onClick={() => {
                  setCorrectionId(null);
                  setError("");
                }}
              >
                ✕
              </button>
            </div>

            <p className="attendance-muted">
              This request requires Super Admin approval.
              Existing biometric break times cannot be
              manually added or edited here.
            </p>

            <label className="attendance-form-field">
              <span>Corrected Status</span>
              <select
                value={correctionStatus}
                onChange={(event) =>
                  setCorrectionStatus(event.target.value)
                }
              >
                <option>Present</option>
                <option>Absent</option>
              </select>
            </label>

            {correctionStatus === "Present" && (
              <div className="attendance-form-row">
                <label className="attendance-form-field">
                  <span>Corrected Punch In</span>
                  <input
                    type="time"
                    value={correctedIn}
                    onChange={(event) =>
                      setCorrectedIn(event.target.value)
                    }
                  />
                </label>

                <label className="attendance-form-field">
                  <span>Corrected Punch Out</span>
                  <input
                    type="time"
                    value={correctedOut}
                    onChange={(event) =>
                      setCorrectedOut(event.target.value)
                    }
                  />
                </label>
              </div>
            )}

            <label className="attendance-form-field">
              <span>Reason</span>
              <textarea
                rows="3"
                value={correctionReason}
                onChange={(event) =>
                  setCorrectionReason(event.target.value)
                }
                placeholder="Why is this correction needed?"
              />
            </label>

            <button
              className="attendance-primary"
              onClick={submitCorrection}
            >
              Submit Correction Request
            </button>
          </div>
        </div>
      )}

      {selectedCorrection && (
        <div className="attendance-overlay">
          <div className="attendance-modal">
            <div className="attendance-modal-heading">
              <h3>Correction Review</h3>
              <button
                onClick={() => {
                  setReviewId(null);
                  setError("");
                }}
              >
                ✕
              </button>
            </div>

            <p>
              <strong>Employee:</strong>{" "}
              {getEmployee(
                selectedCorrection.employeeId
              )?.name}
            </p>

            <p>
              <strong>Reason:</strong>{" "}
              {selectedCorrection.reason}
            </p>

            <div className="attendance-comparison">
              <div>
                <h4>Original</h4>
                <p>Status: {selectedCorrection.original.status}</p>
                <p>In: {selectedCorrection.original.checkIn || "—"}</p>
                <p>Out: {selectedCorrection.original.checkOut || "—"}</p>
              </div>

              <div>
                <h4>Proposed</h4>
                <p>Status: {selectedCorrection.proposed.status}</p>
                <p>In: {selectedCorrection.proposed.checkIn || "—"}</p>
                <p>Out: {selectedCorrection.proposed.checkOut || "—"}</p>
              </div>
            </div>

            {selectedCorrection.status === "Pending" ? (
              <>
                <label className="attendance-form-field">
                  <span>Super Admin Review Note</span>
                  <textarea
                    rows="3"
                    value={reviewNote}
                    onChange={(event) =>
                      setReviewNote(event.target.value)
                    }
                  />
                </label>

                <div className="attendance-review-buttons">
                  <button
                    className="attendance-primary"
                    onClick={() =>
                      reviewCorrection("Approved")
                    }
                  >
                    Approve
                  </button>

                  <button
                    className="attendance-danger"
                    onClick={() =>
                      reviewCorrection("Rejected")
                    }
                  >
                    Reject
                  </button>
                </div>
              </>
            ) : (
              <p>
                <strong>Decision:</strong>{" "}
                {selectedCorrection.status}
                <br />
                <strong>Review Note:</strong>{" "}
                {selectedCorrection.reviewNote}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AttendanceManagement;
