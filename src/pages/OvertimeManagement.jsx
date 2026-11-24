
import { useState } from "react";
import "./OvertimeManagement.css";

function toMinutes(time) {
  if (!time) return 0;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatMinutes(minutes) {
  const hours = Math.floor(Math.abs(minutes) / 60);
  const remaining = Math.abs(minutes) % 60;
  return `${hours}h ${String(remaining).padStart(2, "0")}m`;
}

function getWorkedMinutes(record) {
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

function attendanceSnapshot(record) {
  return JSON.stringify({
    status: record.status,
    checkIn: record.checkIn,
    checkOut: record.checkOut,
    breaks: record.breaks.map((item) => ({
      start: item.start,
      end: item.end,
    })),
  });
}

function OvertimeManagement({
  employees,
  attendance,
  shifts,
  shiftAssignments,
  overtimeRequests,
  setOvertimeRequests,
}) {
  const [showForm, setShowForm] = useState(false);
  const [attendanceId, setAttendanceId] = useState("");
  const [requestedMinutes, setRequestedMinutes] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [reviewId, setReviewId] = useState(null);
  const [reviewNote, setReviewNote] = useState("");
  const [search, setSearch] = useState("");

  function getEmployee(id) {
    return employees.find((employee) => employee.id === id);
  }

  function getShift(employeeId) {
    const assignment = shiftAssignments.find(
      (item) => item.employeeId === employeeId
    );

    if (!assignment) return null;

    return shifts.find(
      (shift) => shift.id === assignment.shiftId
    ) || null;
  }

  function getEligibleMinutes(record, shift) {
    if (!record || !shift || record.status !== "Present") {
      return 0;
    }

    return Math.max(
      0,
      getWorkedMinutes(record) - shift.expectedMinutes
    );
  }

  function getRecord(request) {
    return attendance.find(
      (record) => record.id === request.attendanceId
    );
  }

  function isAttendanceChanged(request) {
    const record = getRecord(request);

    if (!record) return true;

    return (
      attendanceSnapshot(record) !==
      request.attendanceSnapshot
    );
  }

  function hasExistingRequest(id) {
    return overtimeRequests.some(
      (request) =>
        request.attendanceId === id &&
        (request.status === "Pending" ||
          request.status === "Approved")
    );
  }

  const eligibleRecords = attendance
    .filter((record) => {
      const employee = getEmployee(record.employeeId);
      const shift = getShift(record.employeeId);

      return (
        employee?.status === "Active" &&
        getEligibleMinutes(record, shift) > 0 &&
        !hasExistingRequest(record.id)
      );
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const selectedRecord = attendance.find(
    (record) => record.id === attendanceId
  );

  const selectedShift = selectedRecord
    ? getShift(selectedRecord.employeeId)
    : null;

  const maximumMinutes = getEligibleMinutes(
    selectedRecord,
    selectedShift
  );

  const pendingRequests = overtimeRequests.filter(
    (request) => request.status === "Pending"
  );

  const completedRequests = overtimeRequests.filter(
    (request) => request.status !== "Pending"
  );

  const reviewRequest = overtimeRequests.find(
    (request) => request.id === reviewId
  );

  const approvedMinutes = overtimeRequests
    .filter((request) => request.status === "Approved")
    .reduce(
      (total, request) => total + request.requestedMinutes,
      0
    );

  function closeForm() {
    setShowForm(false);
    setAttendanceId("");
    setRequestedMinutes("");
    setReason("");
    setError("");
  }

  function closeReview() {
    setReviewId(null);
    setReviewNote("");
    setError("");
  }

  function openForm() {
    closeReview();
    setAttendanceId("");
    setRequestedMinutes("");
    setReason("");
    setError("");
    setShowForm(true);
  }

  function submitRequest(event) {
    event.preventDefault();

    if (!selectedRecord || !selectedShift) {
      setError("Select an eligible attendance record.");
      return;
    }

    const employee = getEmployee(selectedRecord.employeeId);

    if (!employee || employee.status !== "Active") {
      setError("The employee must be active.");
      return;
    }

    const minutes = Number(requestedMinutes);

    if (
      !Number.isInteger(minutes) ||
      minutes <= 0 ||
      minutes > maximumMinutes
    ) {
      setError(
        `Requested OT must be between 1 and ${maximumMinutes} minutes.`
      );
      return;
    }

    if (!reason.trim()) {
      setError("Enter a reason for overtime.");
      return;
    }

    if (hasExistingRequest(selectedRecord.id)) {
      setError(
        "A pending or approved OT request already exists for this attendance."
      );
      return;
    }

    const newRequest = {
      id: crypto.randomUUID(),
      attendanceId: selectedRecord.id,
      employeeId: selectedRecord.employeeId,
      date: selectedRecord.date,
      employeeName: employee.name,
      shiftId: selectedShift.id,
      shiftName: selectedShift.name,
      expectedMinutes: selectedShift.expectedMinutes,
      workedMinutes: getWorkedMinutes(selectedRecord),
      eligibleMinutes: maximumMinutes,
      requestedMinutes: minutes,
      attendanceSnapshot: attendanceSnapshot(selectedRecord),
      reason: reason.trim(),
      status: "Pending",
      requestedAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedBy: null,
      reviewNote: "",
    };

    setOvertimeRequests((current) => [
      ...current,
      newRequest,
    ]);

    closeForm();
  }

  function openReview(request) {
    closeForm();
    setReviewId(request.id);
    setReviewNote("");
    setError("");
  }

  function decideRequest(decision) {
    if (!reviewRequest || reviewRequest.status !== "Pending") {
      setError("This request is no longer pending.");
      return;
    }

    if (!reviewNote.trim()) {
      setError("Enter a review note before making a decision.");
      return;
    }

    if (decision === "Approved") {
      if (isAttendanceChanged(reviewRequest)) {
        setError(
          "Attendance has changed since this request was submitted. Reject this request and create a new one."
        );
        return;
      }

      const record = getRecord(reviewRequest);

      const eligible = Math.max(
        0,
        getWorkedMinutes(record) -
          reviewRequest.expectedMinutes
      );

      if (reviewRequest.requestedMinutes > eligible) {
        setError(
          "Requested OT now exceeds the eligible duration."
        );
        return;
      }

      const duplicateApproval = overtimeRequests.some(
        (request) =>
          request.id !== reviewRequest.id &&
          request.attendanceId === reviewRequest.attendanceId &&
          request.status === "Approved"
      );

      if (duplicateApproval) {
        setError(
          "Approved overtime already exists for this attendance."
        );
        return;
      }
    }

    setOvertimeRequests((current) =>
      current.map((request) =>
        request.id === reviewRequest.id
          ? {
              ...request,
              status: decision,
              reviewedBy: "Super Admin (Demo)",
              reviewedAt: new Date().toISOString(),
              reviewNote: reviewNote.trim(),
            }
          : request
      )
    );

    closeReview();
  }

  const filteredHistory = completedRequests.filter(
    (request) => {
      const keyword = search.trim().toLowerCase();

      return [
        request.employeeId,
        request.employeeName,
        request.date,
        request.status,
        request.shiftName,
      ].some((value) => value.toLowerCase().includes(keyword));
    }
  );

  return (
    <div className="ot-page">
      <div className="ot-heading">
        <div>
          <h1>Overtime Management</h1>
          <p>
            Request, review and track employee overtime.
          </p>
        </div>

        <button
          className="ot-primary-btn"
          onClick={showForm ? closeForm : openForm}
        >
          {showForm ? "Cancel" : "+ Request Overtime"}
        </button>
      </div>

      <div className="ot-stats">
        <div className="ot-stat">
          <span>Total Requests</span>
          <strong>{overtimeRequests.length}</strong>
        </div>

        <div className="ot-stat">
          <span>Pending Approval</span>
          <strong>{pendingRequests.length}</strong>
        </div>

        <div className="ot-stat">
          <span>Approved OT</span>
          <strong>{formatMinutes(approvedMinutes)}</strong>
        </div>
      </div>

      {showForm && (
        <div className="ot-card">
          <h3>Request Overtime</h3>
          <p className="ot-muted">
            Select attendance with recorded hours above
            the employee's expected shift hours.
          </p>

          <form onSubmit={submitRequest} noValidate>
            <div className="ot-form-grid">
              <div className="ot-field">
                <label htmlFor="ot-attendance">
                  Attendance Record
                </label>

                <select
                  id="ot-attendance"
                  value={attendanceId}
                  onChange={(event) => {
                    setAttendanceId(event.target.value);
                    setRequestedMinutes("");
                    setError("");
                  }}
                >
                  <option value="">Select attendance</option>

                  {eligibleRecords.map((record) => {
                    const employee = getEmployee(
                      record.employeeId
                    );
                    const shift = getShift(
                      record.employeeId
                    );

                    return (
                      <option
                        key={record.id}
                        value={record.id}
                      >
                        {employee.name} - {record.date} -
                        {" "}{formatMinutes(
                          getEligibleMinutes(record, shift)
                        )} extra
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="ot-field">
                <label htmlFor="ot-duration">
                  Requested OT (Minutes)
                </label>

                <input
                  id="ot-duration"
                  type="number"
                  min="1"
                  max={maximumMinutes || undefined}
                  step="1"
                  value={requestedMinutes}
                  onChange={(event) => {
                    setRequestedMinutes(event.target.value);
                    setError("");
                  }}
                  placeholder="Example: 60"
                />
              </div>
            </div>

            {selectedRecord && selectedShift && (
              <div className="ot-summary">
                <div>
                  <span>Assigned Shift</span>
                  <strong>{selectedShift.name}</strong>
                </div>

                <div>
                  <span>Expected Hours</span>
                  <strong>
                    {formatMinutes(
                      selectedShift.expectedMinutes
                    )}
                  </strong>
                </div>

                <div>
                  <span>Worked Hours</span>
                  <strong>
                    {formatMinutes(
                      getWorkedMinutes(selectedRecord)
                    )}
                  </strong>
                </div>

                <div>
                  <span>Maximum Eligible OT</span>
                  <strong>
                    {formatMinutes(maximumMinutes)}
                  </strong>
                </div>
              </div>
            )}

            <div className="ot-field">
              <label htmlFor="ot-reason">
                Reason for Overtime
              </label>

              <textarea
                id="ot-reason"
                rows="3"
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value);
                  setError("");
                }}
                placeholder="Explain why overtime was required"
              />
            </div>

            {error && (
              <p className="ot-error" role="alert">
                {error}
              </p>
            )}

            <div className="ot-actions">
              <button
                type="submit"
                className="ot-primary-btn"
              >
                Submit OT Request
              </button>

              <button
                type="button"
                className="ot-secondary-btn"
                onClick={closeForm}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="ot-card">
        <h3>Super Admin – OT Approvals</h3>

        <p className="ot-muted">
          Review pending overtime requests before approval.
          This is a frontend-only Super Admin demo.
        </p>

        <div className="ot-table-scroll">
          <table className="ot-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Date</th>
                <th>Shift</th>
                <th>Worked</th>
                <th>Eligible</th>
                <th>Requested</th>
                <th>Reason</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {pendingRequests.map((request) => (
                <tr key={request.id}>
                  <td>
                    <strong>{request.employeeName}</strong>
                    <span className="ot-subtext">
                      {request.employeeId}
                    </span>
                  </td>
                  <td>{request.date}</td>
                  <td>{request.shiftName}</td>
                  <td>
                    {formatMinutes(request.workedMinutes)}
                  </td>
                  <td>
                    {formatMinutes(request.eligibleMinutes)}
                  </td>
                  <td>
                    <strong>
                      {formatMinutes(
                        request.requestedMinutes
                      )}
                    </strong>
                  </td>
                  <td>{request.reason}</td>
                  <td>
                    <button
                      className="ot-link-btn"
                      onClick={() => openReview(request)}
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}

              {pendingRequests.length === 0 && (
                <tr>
                  <td colSpan="8" className="ot-empty">
                    No pending overtime requests.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {reviewRequest && (
        <div className="ot-card">
          <h3>Review Overtime Request</h3>

          <p className="ot-muted">
            {reviewRequest.employeeName} |
            {" "}{reviewRequest.date}
          </p>

          <div className="ot-summary">
            <div>
              <span>Shift</span>
              <strong>{reviewRequest.shiftName}</strong>
            </div>

            <div>
              <span>Expected</span>
              <strong>
                {formatMinutes(
                  reviewRequest.expectedMinutes
                )}
              </strong>
            </div>

            <div>
              <span>Worked</span>
              <strong>
                {formatMinutes(
                  reviewRequest.workedMinutes
                )}
              </strong>
            </div>

            <div>
              <span>Requested OT</span>
              <strong>
                {formatMinutes(
                  reviewRequest.requestedMinutes
                )}
              </strong>
            </div>
          </div>

          <p className="ot-review-reason">
            <strong>Reason:</strong>{" "}
            {reviewRequest.reason}
          </p>

          {isAttendanceChanged(reviewRequest) && (
            <p className="ot-warning">
              Attendance has changed since this request
              was created. Approval is blocked until a
              new request is submitted.
            </p>
          )}

          <div className="ot-field">
            <label htmlFor="ot-review-note">
              Super Admin Review Note
            </label>

            <textarea
              id="ot-review-note"
              rows="3"
              value={reviewNote}
              onChange={(event) => {
                setReviewNote(event.target.value);
                setError("");
              }}
              placeholder="Enter approval or rejection remarks"
            />
          </div>

          {error && (
            <p className="ot-error" role="alert">
              {error}
            </p>
          )}

          <div className="ot-actions">
            <button
              className="ot-primary-btn"
              onClick={() => decideRequest("Approved")}
              disabled={isAttendanceChanged(reviewRequest)}
            >
              Approve
            </button>

            <button
              className="ot-danger-btn"
              onClick={() => decideRequest("Rejected")}
            >
              Reject
            </button>

            <button
              className="ot-secondary-btn"
              onClick={closeReview}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="ot-card">
        <div className="ot-table-heading">
          <div>
            <h3>Overtime History</h3>
            <p className="ot-muted">
              Approved and rejected overtime requests.
            </p>
          </div>

          <input
            className="ot-search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search overtime history..."
          />
        </div>

        <div className="ot-table-scroll">
          <table className="ot-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Date</th>
                <th>Requested</th>
                <th>Status</th>
                <th>Reason</th>
                <th>Review Note</th>
                <th>Reviewed By</th>
                <th>Reviewed At</th>
                <th>Attendance</th>
              </tr>
            </thead>

            <tbody>
              {filteredHistory.map((request) => (
                <tr key={request.id}>
                  <td>
                    <strong>{request.employeeName}</strong>
                    <span className="ot-subtext">
                      {request.employeeId}
                    </span>
                  </td>

                  <td>{request.date}</td>

                  <td>
                    {formatMinutes(
                      request.requestedMinutes
                    )}
                  </td>

                  <td>
                    <span
                      className={
                        request.status === "Approved"
                          ? "ot-status approved"
                          : "ot-status rejected"
                      }
                    >
                      {request.status}
                    </span>
                  </td>

                  <td>{request.reason}</td>
                  <td>{request.reviewNote}</td>
                  <td>{request.reviewedBy || "—"}</td>

                  <td>
                    {request.reviewedAt
                      ? new Date(
                          request.reviewedAt
                        ).toLocaleString()
                      : "—"}
                  </td>

                  <td>
                    {isAttendanceChanged(request)
                      ? "Changed since request"
                      : "Unchanged"}
                  </td>
                </tr>
              ))}

              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan="9" className="ot-empty">
                    No completed overtime requests.
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

export default OvertimeManagement;
