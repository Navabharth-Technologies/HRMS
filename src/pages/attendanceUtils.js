import {
  getLocalDate,
  getAssignedShift,
  createShiftSnapshot,
} from "./shiftAssignment.js";

const SIMULATION_SOURCE = "Individual Punch Simulation";

export function getToday() {
  return getLocalDate();
}

// Convert HH:MM into minutes
export function toMinutes(time) {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }

  const [hours, minutes] = time.split(":").map(Number);

  if (hours > 23 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

// Display minutes in HH:MM format
export function formatDuration(minutes) {
  if (
    minutes === null ||
    !Number.isFinite(minutes) ||
    minutes < 0
  ) {
    return "—";
  }

  return (
    String(Math.floor(minutes / 60)).padStart(2, "0") +
    ":" +
    String(minutes % 60).padStart(2, "0")
  );
}

// Find an employee's attendance for a selected date
export function getDailyRecord(
  employeeId,
  date,
  attendance = []
) {
  return attendance.find(
    (item) =>
      item.employeeId === employeeId &&
      item.date === date
  );
}

// Use the original shift when attendance already exists
export function resolveAttendanceShift(
  employeeId,
  date,
  attendance,
  shifts,
  shiftAssignments
) {
  const record = getDailyRecord(
    employeeId,
    date,
    attendance
  );

  return (
    record?.shiftSnapshot ||
    getAssignedShift(
      employeeId,
      date,
      shifts,
      shiftAssignments
    )
  );
}

// Calculate completed break duration
export function calculateBreakMinutes(record) {
  if (!record || !Array.isArray(record.breaks)) {
    return null;
  }

  const start = toMinutes(record.checkIn);
  const end = toMinutes(record.checkOut);

  if (start === null || end === null || end <= start) {
    return null;
  }

  let total = 0;
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

    total += breakEnd - breakStart;
    previousEnd = breakEnd;
  }

  return total;
}

// Show completed breaks during ongoing attendance
export function getRecordedBreakMinutes(record) {
  if (!record) return null;

  let total = 0;
  let previous = toMinutes(record.checkIn);

  if (previous === null) return null;

  const breaks = record.breaks || [];

  for (let index = 0; index < breaks.length; index++) {
    const item = breaks[index];
    const start = toMinutes(item.start);
    const end = toMinutes(item.end);

    if (start === null || start < previous) {
      return null;
    }

    if (!item.end && index === breaks.length - 1) {
      break;
    }

    if (end === null || end <= start) {
      return null;
    }

    total += end - start;
    previous = end;
  }

  return total;
}

// Calculate actual working hours
export function calculateWorkedMinutes(record) {
  if (!record || record.status !== "Present") {
    return null;
  }

  const start = toMinutes(record.checkIn);
  const end = toMinutes(record.checkOut);
  const breaks = calculateBreakMinutes(record);

  if (
    start === null ||
    end === null ||
    end <= start ||
    breaks === null
  ) {
    return null;
  }

  const worked = end - start - breaks;

  return worked > 0 ? worked : null;
}

// Calculate the total break time allowed by the shift
export function getAllowedBreakMinutes(shift) {
  if (!shift || shift.type !== "Fixed") {
    return null;
  }

  const start = toMinutes(shift.startTime);
  const end = toMinutes(shift.endTime);
  const expected = shift.expectedMinutes;

  if (
    start === null ||
    end === null ||
    end <= start ||
    !Number.isFinite(expected) ||
    expected <= 0 ||
    expected > end - start
  ) {
    return null;
  }

  return end - start - expected;
}

// Calculate OT using our existing company rules
export function calculateOvertime(record, shift) {
  shift = record?.shiftSnapshot || shift;

  if (
    !record ||
    record.status !== "Present" ||
    !shift ||
    shift.type !== "Fixed"
  ) {
    return null;
  }

  const workedMinutes = calculateWorkedMinutes(record);

  if (workedMinutes === null) {
    return null;
  }

  const punchIn = toMinutes(record.checkIn);
  const punchOut = toMinutes(record.checkOut);

  const shiftStart = toMinutes(shift.startTime);
  const shiftEnd = toMinutes(shift.endTime);

  const actualBreak = calculateBreakMinutes(record);
  const allowedBreak = getAllowedBreakMinutes(shift);

  if (
    punchIn === null ||
    punchOut === null ||
    shiftStart === null ||
    shiftEnd === null ||
    actualBreak === null ||
    allowedBreak === null
  ) {
    return null;
  }

  const earlyArrival = Math.max(
    0,
    shiftStart - punchIn
  );

  const lateDeparture = Math.max(
    0,
    punchOut - shiftEnd
  );

  const lateArrival = Math.max(
    0,
    punchIn - shiftStart
  );

  const earlyDeparture = Math.max(
    0,
    shiftEnd - punchOut
  );

  // Skipping breaks does not increase OT
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

  return {
    earlyArrival,
    lateDeparture,
    lateArrival,
    earlyDeparture,
    actualBreak,
    allowedBreak,
    excessBreak,
    overtimeMinutes: Math.max(0, netMinutes),
    shortageMinutes: Math.max(0, -netMinutes),
  };
}

// Find the last recorded punch
export function getLastPunch(record) {
  if (!record || !record.checkIn) {
    return null;
  }

  if (record.checkOut) {
    return {
      action: "Punch Out",
      time: record.checkOut,
    };
  }

  const breaks = record.breaks || [];
  const lastBreak = breaks[breaks.length - 1];

  if (lastBreak) {
    return {
      action: lastBreak.end
        ? `Break In: ${lastBreak.name || "Break"}`
        : `Break Out: ${lastBreak.name || "Break"}`,

      time: lastBreak.end || lastBreak.start,
    };
  }

  return {
    action: "Punch In",
    time: record.checkIn,
  };
}

// Get attendance status for the selected date
export function getAttendanceStatus(
  employee,
  date,
  record
) {
  if (record) {
    if (record.status === "Absent") {
      return "Absent";
    }

    if (calculateWorkedMinutes(record) !== null) {
      return "Present";
    }

    if (
      record.source === SIMULATION_SOURCE &&
      record.status === "Present" &&
      toMinutes(record.checkIn) !== null &&
      !record.checkOut
    ) {
      if (date < getToday()) {
        return "Needs Review";
      }

      const breaks = record.breaks || [];
      const lastBreak = breaks[breaks.length - 1];

      return lastBreak && !lastBreak.end
        ? "On Break"
        : "Working";
    }

    return "Needs Review";
  }

  if (date < employee.joiningDate) {
    return "Not Joined";
  }

  if (employee.status === "Inactive") {
    return "Inactive";
  }

  return "Not Recorded";
}

// Get employee attendance summary
export function getEmployeeAttendance(
  employee,
  date,
  attendance,
  shifts,
  shiftAssignments
) {
  const record = getDailyRecord(
    employee.id,
    date,
    attendance
  );

  const shift = resolveAttendanceShift(
    employee.id,
    date,
    attendance,
    shifts,
    shiftAssignments
  );

  const workedMinutes = calculateWorkedMinutes(record);
  const overtime = calculateOvertime(record, shift);

  const attendanceStatus = getAttendanceStatus(
    employee,
    date,
    record
  );

  let overtimeStatus = "";

  if (attendanceStatus === "Present") {
    if (!shift) {
      overtimeStatus = "No Shift Assigned";
    } else if (shift.type !== "Fixed") {
      overtimeStatus = "Policy Not Set";
    } else if (overtime === null) {
      overtimeStatus = "Needs Review";
    } else {
      overtimeStatus = "Automatic";
    }
  }

  return {
    record,
    shift,

    checkIn: record?.checkIn || "—",
    checkOut: record?.checkOut || "—",

    expectedMinutes: shift?.expectedMinutes ?? null,

    workedMinutes,

    allowedBreakMinutes:
      getAllowedBreakMinutes(shift),

    actualBreakMinutes:
      calculateBreakMinutes(record) ??
      getRecordedBreakMinutes(record),

    overtimeMinutes:
      overtime?.overtimeMinutes ?? null,

    shortageMinutes:
      overtime?.shortageMinutes ?? null,

    overtimeStatus,
    attendanceStatus,

    shiftName: shift?.name || "Not Assigned",

    overtimeDetails: overtime,

    lastPunch: getLastPunch(record),
  };
}

// Get configured breaks that have not been taken
function getRemainingBreaks(record, shift) {
  const configuredBreaks =
    record?.shiftSnapshot?.breaks ||
    shift?.breaks ||
    [];

  const takenBreaks = record?.breaks || [];

  return configuredBreaks
    .filter(
      (item) =>
        !takenBreaks.some(
          (taken) => taken.breakId === item.id
        )
    )
    .sort(
      (a, b) =>
        toMinutes(a.start) - toMinutes(b.start)
    );
}

// Get available actions using unique break IDs
export function getAttendanceActionOptions(
  record,
  shift
) {
  if (!record) {
    return shift
      ? [{ value: "Punch In", label: "Punch In" }]
      : [];
  }

  if (
    record.source !== SIMULATION_SOURCE ||
    record.status !== "Present" ||
    record.checkOut ||
    !record.checkIn
  ) {
    return [];
  }

  const breaks = record.breaks || [];
  const lastBreak = breaks[breaks.length - 1];

  if (lastBreak && !lastBreak.end) {
    return [
      {
        value: "Break In",
        label: `Break In: ${lastBreak.name || "Break"}`,
      },
    ];
  }

  const remaining = getRemainingBreaks(
    record,
    shift
  );

  return [
    ...remaining.map((item) => ({
      value: `break:${item.id}`,
      label: `Break Out: ${item.name}`,
    })),

    {
      value: "Additional Break Out",
      label: "Additional Break Out",
    },

    {
      value: "Punch Out",
      label: "Punch Out",
    },
  ];
}

// Keep the existing employee screen compatible
export function getAttendanceActions(record, shift) {
  return getAttendanceActionOptions(
    record,
    shift
  ).map((item) =>
    item.value.startsWith("break:")
      ? item.label
      : item.value
  );
}

// Suggest the next scheduled attendance action
export function getSuggestedAction(record, shift) {
  const options = getAttendanceActionOptions(
    record,
    shift
  );

  if (!options.length) return "";

  if (!record) return "Punch In";

  const breaks = record.breaks || [];
  const lastBreak = breaks[breaks.length - 1];

  if (lastBreak && !lastBreak.end) {
    return "Break In";
  }

  const previousTime = toMinutes(
    getLastPunch(record)?.time
  );

  const nextBreak = getRemainingBreaks(
    record,
    shift
  ).find(
    (item) =>
      toMinutes(item.start) > previousTime
  );

  return nextBreak
    ? `break:${nextBreak.id}`
    : "Punch Out";
}

// Suggest scheduled time for simulation
export function getSuggestedPunchTime(
  action,
  record,
  shift
) {
  const activeShift =
    record?.shiftSnapshot || shift;

  const configuredBreaks =
    activeShift?.breaks || [];

  let suggestedTime = "";

  if (action === "Punch In") {
    suggestedTime = activeShift?.startTime || "";
  } else if (action === "Punch Out") {
    suggestedTime = activeShift?.endTime || "";
  } else if (action.startsWith("break:")) {
    const id = action.slice(6);

    suggestedTime =
      configuredBreaks.find(
        (item) => String(item.id) === id
      )?.start || "";
  } else if (action === "Break In") {
    const breaks = record?.breaks || [];
    const lastBreak = breaks[breaks.length - 1];

    suggestedTime =
      configuredBreaks.find(
        (item) => item.id === lastBreak?.breakId
      )?.end || "";
  }

  const lastPunch = getLastPunch(record);

  if (
    lastPunch &&
    suggestedTime &&
    toMinutes(suggestedTime) <=
      toMinutes(lastPunch.time)
  ) {
    // Let the admin enter a valid time
    return "";
  }

  return suggestedTime;
}

// Check if a date is valid
function isValidDate(date) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date || "") &&
    !Number.isNaN(Date.parse(date)) &&
    new Date(date).toISOString().slice(0, 10) === date
  );
}

// Record an attendance punch
export function applyAttendanceAction({
  employee,
  date,
  time,
  action,
  record,
  shift,
}) {
  if (!employee || employee.status !== "Active") {
    throw new Error("Employee is inactive.");
  }

  if (!isValidDate(date)) {
    throw new Error("Select a valid attendance date.");
  }

  if (date > getToday()) {
    throw new Error(
      "Attendance cannot be recorded for future dates."
    );
  }

  if (date < employee.joiningDate) {
    throw new Error(
      "Attendance date is before employee joining date."
    );
  }

  if (
    record &&
    (
      record.employeeId !== employee.id ||
      record.date !== date
    )
  ) {
    throw new Error(
      "Attendance record does not match the employee or date."
    );
  }

  const minutes = toMinutes(time);

  if (minutes === null) {
    throw new Error(
      "Enter a valid punch time in HH:MM format."
    );
  }

  const activeShift =
    record?.shiftSnapshot || shift;

  if (!activeShift) {
    throw new Error(
      "Assign a shift before recording attendance."
    );
  }

  const options = getAttendanceActionOptions(
    record,
    activeShift
  );

  // Support the old screen until its replacement
  const matchedAction =
    options.find((item) => item.value === action) ||
    options.find((item) => item.label === action);

  if (!matchedAction) {
    throw new Error(
      "This attendance action is not available."
    );
  }

  action = matchedAction.value;

  if (action === "Punch In") {
    return {
      id: crypto.randomUUID(),
      employeeId: employee.id,
      date,
      status: "Present",
      checkIn: time,
      checkOut: "",
      breaks: [],
      source: SIMULATION_SOURCE,
      shiftSnapshot: createShiftSnapshot(activeShift),
    };
  }

  const lastPunch = getLastPunch(record);

  if (
    lastPunch &&
    (
      toMinutes(lastPunch.time) === null ||
      minutes <= toMinutes(lastPunch.time)
    )
  ) {
    throw new Error(
      `Previous punch: ${lastPunch.action} at ` +
      `${lastPunch.time}. Enter a time after ` +
      `${lastPunch.time}.`
    );
  }

  const breaks = (record.breaks || []).map(
    (item) => ({ ...item })
  );

  // Record a configured break
  if (action.startsWith("break:")) {
    const breakId = action.slice(6);

    const configuredBreak = getRemainingBreaks(
      record,
      activeShift
    ).find(
      (item) => String(item.id) === breakId
    );

    if (!configuredBreak) {
      throw new Error(
        "This scheduled break is not available."
      );
    }

    breaks.push({
      breakId: configuredBreak.id,
      name: configuredBreak.name,
      start: time,
      end: "",
      type: "Scheduled",
    });

    return {
      ...record,
      breaks,
    };
  }

  // Record an additional unscheduled break
  if (action === "Additional Break Out") {
    breaks.push({
      breakId: crypto.randomUUID(),
      name: "Additional Break",
      start: time,
      end: "",
      type: "Additional",
    });

    return {
      ...record,
      breaks,
    };
  }

  // Complete the current break
  if (action === "Break In") {
    const lastBreak = breaks[breaks.length - 1];

    if (!lastBreak || lastBreak.end) {
      throw new Error(
        "There is no active break to complete."
      );
    }

    lastBreak.end = time;

    return {
      ...record,
      breaks,
    };
  }

  // Complete attendance
  if (action === "Punch Out") {
    if (breaks.some((item) => !item.end)) {
      throw new Error(
        "Complete the active break before Punch Out."
      );
    }

    const completedRecord = {
      ...record,
      checkOut: time,
      breaks,
    };

    if (
      calculateWorkedMinutes(completedRecord) === null
    ) {
      throw new Error(
        "Attendance timings are invalid. Review the punches."
      );
    }

    return completedRecord;
  }

  throw new Error("Unknown attendance action.");
}

// Check whether the latest punch can be undone
export function canUndoLastPunch(record) {
  return Boolean(
    record &&
    record.source === SIMULATION_SOURCE &&
    record.status === "Present" &&
    record.checkIn &&
    !record.checkOut
  );
}

// Undo only the latest unfinished simulated punch
export function undoLastPunch(record) {
  if (!canUndoLastPunch(record)) {
    throw new Error(
      "Completed or biometric attendance requires correction."
    );
  }

  const breaks = (record.breaks || []).map(
    (item) => ({ ...item })
  );

  if (breaks.length === 0) {
    // Remove the attendance record if Punch In is undone
    return null;
  }

  const lastBreak = breaks[breaks.length - 1];

  if (lastBreak.end) {
    lastBreak.end = "";
  } else {
    breaks.pop();
  }

  return {
    ...record,
    breaks,
  };
}

// Build scheduled and actual attendance history
export function getPunchHistory(record, shift) {
  const activeShift =
    record?.shiftSnapshot || shift;

  const scheduledBreaks =
    activeShift?.breaks || [];

  const actualBreaks = record?.breaks || [];

  const source = record?.source || "—";

  const completed =
    calculateWorkedMinutes(record) !== null;

  const rows = [];

  function addRow(
    id,
    event,
    scheduled,
    actual,
    emptyStatus = "Pending"
  ) {
    rows.push({
      id,
      event,
      scheduled: scheduled || "—",
      actual: actual || "—",
      source: actual ? source : "—",
      status: actual ? "Recorded" : emptyStatus,
    });
  }

  addRow(
    "punch-in",
    "Punch In",
    activeShift?.startTime,
    record?.checkIn
  );

  const matchedBreaks = new Set();

  scheduledBreaks.forEach((item) => {
    const actualIndex = actualBreaks.findIndex(
      (taken, index) =>
        !matchedBreaks.has(index) &&
        taken.breakId === item.id
    );

    const actual =
      actualIndex >= 0
        ? actualBreaks[actualIndex]
        : null;

    if (actualIndex >= 0) {
      matchedBreaks.add(actualIndex);
    }

    addRow(
      `${item.id}-out`,
      `${item.name} Out`,
      item.start,
      actual?.start,
      completed ? "Skipped" : "Pending"
    );

    addRow(
      `${item.id}-in`,
      `${item.name} In`,
      item.end,
      actual?.end,
      completed && !actual ? "Skipped" : "Pending"
    );
  });

  // Include additional and older unmatched breaks
  actualBreaks.forEach((item, index) => {
    if (matchedBreaks.has(index)) return;

    const name =
      item.name ||
      `Recorded Break ${index + 1}`;

    addRow(
      `extra-${index}-out`,
      `${name} Out`,
      "",
      item.start
    );

    addRow(
      `extra-${index}-in`,
      `${name} In`,
      "",
      item.end
    );
  });

  addRow(
    "punch-out",
    "Punch Out",
    activeShift?.endTime,
    record?.checkOut
  );

  return rows;
}

// Navigate to the previous or next attendance date
export function changeAttendanceDate(date, days) {
  if (!isValidDate(date)) {
    return getToday();
  }

  const [year, month, day] =
    date.split("-").map(Number);

  const nextDate = new Date(
    year,
    month - 1,
    day
  );

  nextDate.setDate(nextDate.getDate() + days);

  return [
    nextDate.getFullYear(),
    String(nextDate.getMonth() + 1).padStart(2, "0"),
    String(nextDate.getDate()).padStart(2, "0"),
  ].join("-");
}