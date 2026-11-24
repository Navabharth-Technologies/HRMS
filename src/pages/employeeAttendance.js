
export function getToday() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

// Convert time into minutes
function toMinutes(time) {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }

  const [hours, minutes] = time.split(":").map(Number);

  if (hours > 23 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

// Display minutes as hours and minutes
export function formatDuration(minutes) {
  if (minutes === null || !Number.isFinite(minutes)) {
    return "—";
  }

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  if (hours === 0) {
    return `${remaining}m`;
  }

  return `${hours}h ${String(remaining).padStart(2, "0")}m`;
}

// Calculate actual break duration
function calculateBreakMinutes(record) {
  const start = toMinutes(record.checkIn);
  const end = toMinutes(record.checkOut);

  if (start === null || end === null || end <= start) {
    return null;
  }

  if (!Array.isArray(record.breaks)) {
    return null;
  }

  let breakMinutes = 0;
  let previousEnd = start;

  for (const item of record.breaks) {
    const breakStart = toMinutes(item.start);
    const breakEnd = toMinutes(item.end);

    if (
      breakStart === null ||
      breakEnd === null ||
      breakStart < previousEnd ||
      breakEnd <= breakStart ||
      breakEnd > end
    ) {
      return null;
    }

    breakMinutes += breakEnd - breakStart;
    previousEnd = breakEnd;
  }

  return breakMinutes;
}

// Calculate actual working hours
function calculateWorkedMinutes(record) {
  if (!record || record.status !== "Present") {
    return null;
  }

  const start = toMinutes(record.checkIn);
  const end = toMinutes(record.checkOut);
  const breakMinutes = calculateBreakMinutes(record);

  if (
    start === null ||
    end === null ||
    end <= start ||
    breakMinutes === null
  ) {
    return null;
  }

  return end - start - breakMinutes;
}

// Calculate OT based on company shift timings
export function calculateOvertime(record, shift) {
  if (
    !record ||
    record.status !== "Present" ||
    !shift ||
    shift.type !== "Fixed"
  ) {
    return null;
  }

  const punchIn = toMinutes(record.checkIn);
  const punchOut = toMinutes(record.checkOut);

  const shiftStart = toMinutes(shift.startTime);
  const shiftEnd = toMinutes(shift.endTime);

  const actualBreak = calculateBreakMinutes(record);

  if (
    punchIn === null ||
    punchOut === null ||
    shiftStart === null ||
    shiftEnd === null ||
    actualBreak === null ||
    punchOut <= punchIn ||
    shiftEnd <= shiftStart
  ) {
    return null;
  }

  const shiftDuration = shiftEnd - shiftStart;
  const expectedMinutes = shift.expectedMinutes;

  if (
    !Number.isFinite(expectedMinutes) ||
    expectedMinutes <= 0 ||
    expectedMinutes > shiftDuration
  ) {
    return null;
  }

  const allowedBreak = shiftDuration - expectedMinutes;

  // Extra time before and after shift
  const earlyArrival = Math.max(
    0,
    shiftStart - punchIn
  );

  const lateDeparture = Math.max(
    0,
    punchOut - shiftEnd
  );

  // Time lost due to late arrival or early departure
  const lateArrival = Math.max(
    0,
    punchIn - shiftStart
  );

  const earlyDeparture = Math.max(
    0,
    shiftEnd - punchOut
  );

  // Only extended breaks reduce OT
  const excessBreak = Math.max(
    0,
    actualBreak - allowedBreak
  );

  const netMinutes =
    earlyArrival +
    lateDeparture -
    lateArrival -
    earlyDeparture -
    excessBreak;

  const overtimeMinutes = Math.max(0, netMinutes);

  const shortageMinutes = Math.max(0, -netMinutes);

  return {
    earlyArrival,
    lateDeparture,
    lateArrival,
    earlyDeparture,
    actualBreak,
    allowedBreak,
    excessBreak,
    overtimeMinutes,
    shortageMinutes,
  };
}

// Get attendance details for one employee
export function getEmployeeAttendance(
  employee,
  date,
  attendance,
  shifts,
  shiftAssignments
) {
  const record = attendance.find(
    (item) =>
      item.employeeId === employee.id &&
      item.date === date
  );

  const assignment = shiftAssignments.find(
    (item) => item.employeeId === employee.id
  );

  const shift = shifts.find(
    (item) => item.id === assignment?.shiftId
  );

  const workedMinutes = calculateWorkedMinutes(record);

  const overtime = calculateOvertime(record, shift);

  let attendanceStatus = "Not Recorded";

  if (record) {
    if (record.status === "Absent") {
      attendanceStatus = "Absent";
    } else if (workedMinutes !== null) {
      attendanceStatus = "Present";
    } else {
      attendanceStatus = "Needs Review";
    }
  } else if (date < employee.joiningDate) {
    attendanceStatus = "Not Joined";
  } else if (employee.status === "Inactive") {
    attendanceStatus = "Inactive";
  }

  let overtimeStatus = "";

  if (attendanceStatus === "Present") {
    if (!shift) {
      overtimeStatus = "No Shift Assigned";
    } else if (shift.type !== "Fixed") {
      overtimeStatus = "Policy Not Set";
    } else if (overtime === null) {
      overtimeStatus = "Needs Review";
    } else if (overtime.overtimeMinutes > 0) {
      overtimeStatus = "Automatic";
    }
  }

  return {
    checkIn: record?.checkIn || "—",
    checkOut: record?.checkOut || "—",

    workedMinutes,

    overtimeMinutes:
      overtime?.overtimeMinutes ?? null,

    shortageMinutes:
      overtime?.shortageMinutes ?? null,

    overtimeStatus,
    attendanceStatus,

    shiftName: shift?.name || "Not Assigned",

    overtimeDetails: overtime,
  };
}
