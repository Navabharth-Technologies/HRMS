// Get today's local date
export function getLocalDate() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

// Find the assignment applicable to a selected date
export function getShiftAssignment(
  employeeId,
  date,
  assignments = []
) {
  return assignments
    .filter(
      (item) =>
        item.employeeId === employeeId &&
        (item.effectiveFrom || "0000-01-01") <= date
    )
    .sort((a, b) =>
      (b.effectiveFrom || "0000-01-01").localeCompare(
        a.effectiveFrom || "0000-01-01"
      )
    )[0] || null;
}

// Find the employee's shift for a particular date
export function getAssignedShift(
  employeeId,
  date,
  shifts = [],
  assignments = []
) {
  const assignment = getShiftAssignment(
    employeeId,
    date,
    assignments
  );

  return (
    shifts.find(
      (shift) => shift.id === assignment?.shiftId
    ) || null
  );
}

// Get previous, current and upcoming assignments
export function getAssignmentHistory(
  employeeId,
  assignments = []
) {
  const today = getLocalDate();

  const current = getShiftAssignment(
    employeeId,
    today,
    assignments
  );

  return assignments
    .filter(
      (item) => item.employeeId === employeeId
    )
    .sort((a, b) =>
      (b.effectiveFrom || "").localeCompare(
        a.effectiveFrom || ""
      )
    )
    .map((item) => ({
      ...item,

      assignmentStatus:
        item.effectiveFrom > today
          ? "Upcoming"
          : item === current
            ? "Current"
            : "Previous",
    }));
}

// Preserve shift details for historical attendance
export function createShiftSnapshot(shift) {
  if (!shift) return null;

  return {
    ...shift,
    breaks: (shift.breaks || []).map(
      (item) => ({ ...item })
    ),
  };
}

// Validate bulk shift assignments
export function validateBulkAssignment({
  employeeIds,
  employees,
  shiftId,
  shifts,
  effectiveFrom,
  assignments,
  attendance,
}) {
  const errors = [];

  if (!shifts.some((shift) => shift.id === shiftId)) {
    errors.push("Select a valid shift.");
  }

  if (!employeeIds.length) {
    errors.push("Select at least one employee.");
  }

  const validDate =
    /^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom || "") &&
    !Number.isNaN(Date.parse(effectiveFrom)) &&
    new Date(effectiveFrom).toISOString().slice(0, 10)
      === effectiveFrom;

  if (!validDate || effectiveFrom < getLocalDate()) {
    errors.push(
      "Select today or a future effective date."
    );
  }

  const uniqueIds = [...new Set(employeeIds)];

  uniqueIds.forEach((employeeId) => {
    const employee = employees.find(
      (item) => item.id === employeeId
    );

    if (!employee || employee.status !== "Active") {
      errors.push(
        `${employeeId}: Employee is not active.`
      );
      return;
    }

    if (effectiveFrom < employee.joiningDate) {
      errors.push(
        `${employee.name}: Date is before joining date.`
      );
    }

    const duplicate = assignments.some(
      (item) =>
        item.employeeId === employeeId &&
        item.effectiveFrom === effectiveFrom
    );

    if (duplicate) {
      errors.push(
        `${employee.name}: An assignment already exists for this date.`
      );
    }

    const existingAttendance = attendance.some(
      (record) =>
        record.employeeId === employeeId &&
        record.date === effectiveFrom
    );

    if (existingAttendance) {
      errors.push(
        `${employee.name}: Attendance already exists for the effective date.`
      );
    }
  });

  return errors;
}