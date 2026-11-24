
import { useState } from "react";
import "./EmployeeLoans.css";

const money = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

function currentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

function addMonths(month, count) {
  const [year, number] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, number - 1 + count, 1));

  return `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() + 1
  ).padStart(2, "0")}`;
}

function round(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getEmployeeId(employee) {
  return String(employee.employeeId || employee.id || "");
}

function getEmployeeName(employee) {
  return employee.name || employee.fullName || "Unnamed Employee";
}

function getPaidAmount(loan) {
  return round(
    loan.payments.reduce((total, payment) => total + payment.amount, 0)
  );
}

function getBalance(loan) {
  return round(Math.max(0, loan.amount - getPaidAmount(loan)));
}

function getSchedule(loan) {
  const schedule = [];
  let remaining = getBalance(loan);
  let monthIndex = 0;

  const paidMonths = new Set(
    loan.payments.map((payment) => payment.month)
  );

  // This is only a future EMI projection.
  while (remaining > 0 && monthIndex < 600) {
    const month = addMonths(loan.startMonth, monthIndex);
    monthIndex++;

    if (paidMonths.has(month)) continue;

    const amount = round(Math.min(loan.emi, remaining));

    schedule.push({ month, amount });
    remaining = round(remaining - amount);
  }

  return schedule;
}

function EmployeeLoans({ employees = [], loans = [], setLoans }) {
  const [employeeId, setEmployeeId] = useState("");
  const [amount, setAmount] = useState("1000");
  const [emi, setEmi] = useState("100");
  const [startMonth, setStartMonth] = useState(currentMonth());
  const [purpose, setPurpose] = useState("");

  const [selectedId, setSelectedId] = useState("");
  const [reason, setReason] = useState("");
  const [newEmi, setNewEmi] = useState("");
  const [paymentMonth, setPaymentMonth] = useState(currentMonth());

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const activeEmployees = employees.filter(
    (employee) => employee.status === "Active"
  );

  const selectedLoan = loans.find((loan) => loan.id === selectedId);

  function showMessage(message, isError = false) {
    setError(isError ? message : "");
    setSuccess(isError ? "" : message);
  }

  function updateLoan(id, callback) {
    setLoans((current) =>
      current.map((loan) =>
        loan.id === id ? callback(loan) : loan
      )
    );
  }

  function addHistory(loan, action, details) {
    return {
      ...loan,
      history: [
        ...loan.history,
        {
          id: crypto.randomUUID(),
          action,
          details,
          date: new Date().toISOString(),
          by: "Super Admin (Demo)",
        },
      ],
    };
  }

  function createLoan(event) {
    event.preventDefault();

    if (typeof setLoans !== "function") {
      showMessage("Loan state is not connected in App.jsx.", true);
      return;
    }

    const principal = Number(amount);
    const monthlyEmi = Number(emi);

    if (
      !activeEmployees.some(
        (employee) => getEmployeeId(employee) === employeeId
      )
    ) {
      showMessage("Please select an active employee.", true);
      return;
    }

    if (
      !Number.isFinite(principal) ||
      !Number.isFinite(monthlyEmi) ||
      principal <= 0 ||
      monthlyEmi <= 0 ||
      Math.round(principal * 100) !== principal * 100 ||
      Math.round(monthlyEmi * 100) !== monthlyEmi * 100
    ) {
      showMessage("Enter valid positive loan and EMI amounts.", true);
      return;
    }

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(startMonth)) {
      showMessage("Please select a valid start month.", true);
      return;
    }

    if (!purpose.trim()) {
      showMessage("Please enter the loan purpose.", true);
      return;
    }

    const loan = {
      id: crypto.randomUUID(),
      employeeId,
      amount: principal,
      emi: monthlyEmi,
      startMonth,
      purpose: purpose.trim(),
      status: "Pending",
      payments: [],
      history: [],
      createdAt: new Date().toISOString(),
    };

    const newLoan = addHistory(
      loan,
      "Loan Created",
      "Loan request submitted for approval"
    );

    setLoans((current) => [...current, newLoan]);

    setSelectedId(newLoan.id);
    setPurpose("");

    showMessage("Loan request created successfully.");
  }

  function changeStatus(action) {
    if (!selectedLoan) return;

    if (!reason.trim()) {
      showMessage("Please enter a reason for this action.", true);
      return;
    }

    const allowed = {
      Approved: ["Pending"],
      Rejected: ["Pending"],
      Paused: ["Approved"],
      Resumed: ["Paused"],
      Closed: ["Approved", "Paused"],
    };

    if (!allowed[action]?.includes(selectedLoan.status)) {
      showMessage("This action is not allowed.", true);
      return;
    }

    if (action === "Closed" && getBalance(selectedLoan) > 0) {
      showMessage(
        "The loan still has an outstanding balance. It cannot be closed.",
        true
      );
      return;
    }

    const status = action === "Resumed" ? "Approved" : action;

    updateLoan(selectedLoan.id, (loan) =>
      addHistory(
        { ...loan, status },
        action,
        reason.trim()
      )
    );

    setReason("");
    showMessage(`Loan ${action.toLowerCase()} successfully.`);
  }

  function reviseEmi() {
    if (!selectedLoan) return;

    if (!["Approved", "Paused"].includes(selectedLoan.status)) {
      showMessage("Only approved or paused loans can be revised.", true);
      return;
    }

    const amount = Number(newEmi);

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      Math.round(amount * 100) !== amount * 100
    ) {
      showMessage("Enter a valid new EMI amount.", true);
      return;
    }

    if (!reason.trim()) {
      showMessage("Enter a reason for the EMI revision.", true);
      return;
    }

    updateLoan(selectedLoan.id, (loan) =>
      addHistory(
        { ...loan, emi: amount },
        "EMI Revised",
        `Changed from ${money(loan.emi)} to ${money(amount)}. ${reason}`
      )
    );

    setNewEmi("");
    setReason("");
    showMessage("Future EMI amount updated successfully.");
  }

  function simulatePayment() {
    if (!selectedLoan || selectedLoan.status !== "Approved") {
      showMessage("Only approved active loans can receive payments.", true);
      return;
    }

    if (
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(paymentMonth) ||
      paymentMonth < selectedLoan.startMonth
    ) {
      showMessage("Select a valid repayment month.", true);
      return;
    }

    const alreadyPaid = selectedLoan.payments.some(
      (payment) => payment.month === paymentMonth
    );

    if (alreadyPaid) {
      showMessage("EMI is already recorded for this month.", true);
      return;
    }

    const balance = getBalance(selectedLoan);
    const payment = round(Math.min(selectedLoan.emi, balance));

    if (payment <= 0) {
      showMessage("This loan has already been repaid.", true);
      return;
    }

    updateLoan(selectedLoan.id, (loan) => {
      const updated = {
        ...loan,
        payments: [
          ...loan.payments,
          {
            id: crypto.randomUUID(),
            month: paymentMonth,
            amount: payment,
            source: "Demo Simulation",
            date: new Date().toISOString(),
          },
        ],
      };

      return addHistory(
        updated,
        "Demo EMI Payment",
        `${money(payment)} simulated for ${paymentMonth}`
      );
    });

    showMessage(
      `${money(payment)} demo repayment recorded. No real salary was deducted.`
    );
  }

  const outstanding = loans
    .filter((loan) => ["Approved", "Paused"].includes(loan.status))
    .reduce((total, loan) => total + getBalance(loan), 0);

  return (
    <div className="loans-panel">
      <div className="loans-header">
        <div>
          <h2>Employee Loan Management</h2>
          <p>Manage interest-free loans and monthly EMI repayments.</p>
        </div>
        <span className="loans-demo">Frontend Demo</span>
      </div>

      {error && <div className="loans-error">{error}</div>}
      {success && <div className="loans-success">{success}</div>}

      <div className="loans-stats">
        <div>
          <span>Total Loans</span>
          <strong>{loans.length}</strong>
        </div>
        <div>
          <span>Pending Approval</span>
          <strong>
            {loans.filter((loan) => loan.status === "Pending").length}
          </strong>
        </div>
        <div>
          <span>Outstanding Balance</span>
          <strong>{money(outstanding)}</strong>
        </div>
      </div>

      <div className="loans-section">
        <h3>Create Employee Loan</h3>

        <form className="loans-form" onSubmit={createLoan}>
          <label>
            Employee
            <select
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
            >
              <option value="">Select employee</option>
              {activeEmployees.map((employee) => (
                <option
                  key={getEmployeeId(employee)}
                  value={getEmployeeId(employee)}
                >
                  {getEmployeeId(employee)} - {getEmployeeName(employee)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Loan Amount (₹)
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>

          <label>
            Monthly EMI (₹)
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={emi}
              onChange={(event) => setEmi(event.target.value)}
            />
          </label>

          <label>
            Start Month
            <input
              type="month"
              value={startMonth}
              onChange={(event) => setStartMonth(event.target.value)}
            />
          </label>

          <label className="loans-wide">
            Loan Purpose
            <input
              value={purpose}
              placeholder="Example: Emergency advance"
              onChange={(event) => setPurpose(event.target.value)}
            />
          </label>

          <button className="payroll-primary" type="submit">
            Create Loan Request
          </button>
        </form>
      </div>

      <div className="loans-section">
        <h3>Employee Loan Register</h3>

        <div className="payroll-table-wrap">
          <table className="payroll-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Loan</th>
                <th>EMI</th>
                <th>Repaid</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => {
                const employee = employees.find(
                  (item) => getEmployeeId(item) === loan.employeeId
                );

                return (
                  <tr key={loan.id}>
                    <td>
                      {employee
                        ? getEmployeeName(employee)
                        : loan.employeeId}
                    </td>
                    <td>{money(loan.amount)}</td>
                    <td>{money(loan.emi)}</td>
                    <td>{money(getPaidAmount(loan))}</td>
                    <td>{money(getBalance(loan))}</td>
                    <td>
                      <span className="loans-status">{loan.status}</span>
                    </td>
                    <td>
                      <button
                        className="payroll-link"
                        onClick={() => {
                          setSelectedId(loan.id);
                          showMessage("");
                        }}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                );
              })}

              {loans.length === 0 && (
                <tr>
                  <td colSpan="7" className="payroll-empty">
                    No employee loans created yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedLoan && (
        <div className="loans-section">
          <h3>Manage Loan – {selectedLoan.employeeId}</h3>

          <div className="loans-details">
            <span>Loan: <b>{money(selectedLoan.amount)}</b></span>
            <span>EMI: <b>{money(selectedLoan.emi)}</b></span>
            <span>Balance: <b>{money(getBalance(selectedLoan))}</b></span>
            <span>Status: <b>{selectedLoan.status}</b></span>
          </div>

          <label className="loans-reason">
            Action Reason
            <input
              value={reason}
              placeholder="Required for approval and changes"
              onChange={(event) => setReason(event.target.value)}
            />
          </label>

          <div className="loans-actions">
            {selectedLoan.status === "Pending" && (
              <>
                <button onClick={() => changeStatus("Approved")}>
                  Approve Loan
                </button>
                <button onClick={() => changeStatus("Rejected")}>
                  Reject Loan
                </button>
              </>
            )}

            {selectedLoan.status === "Approved" && (
              <button onClick={() => changeStatus("Paused")}>
                Pause EMI
              </button>
            )}

            {selectedLoan.status === "Paused" && (
              <button onClick={() => changeStatus("Resumed")}>
                Resume EMI
              </button>
            )}

            {["Approved", "Paused"].includes(selectedLoan.status) && (
              <button onClick={() => changeStatus("Closed")}>
                Close Repaid Loan
              </button>
            )}
          </div>

          {["Approved", "Paused"].includes(selectedLoan.status) && (
            <div className="loans-inline">
              <label>
                New Monthly EMI
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={newEmi}
                  onChange={(event) => setNewEmi(event.target.value)}
                />
              </label>
              <button onClick={reviseEmi}>Revise EMI</button>
            </div>
          )}

          <div className="loans-demo-payment">
            <h4>Demo EMI Repayment</h4>
            <p>
              This is a test simulation. It does not deduct
              money from actual salary or finalize payroll.
            </p>

            <div className="loans-inline">
              <label>
                Repayment Month
                <input
                  type="month"
                  value={paymentMonth}
                  onChange={(event) => setPaymentMonth(event.target.value)}
                />
              </label>

              <button
                disabled={
                  selectedLoan.status !== "Approved" ||
                  getBalance(selectedLoan) === 0
                }
                onClick={simulatePayment}
              >
                Simulate EMI Payment
              </button>
            </div>
          </div>

          <div className="loans-columns">
            <div>
              <h4>Repayment History</h4>

              <div className="payroll-table-wrap">
                <table className="payroll-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Amount</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedLoan.payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{payment.month}</td>
                        <td>{money(payment.amount)}</td>
                        <td>{payment.source}</td>
                      </tr>
                    ))}

                    {selectedLoan.payments.length === 0 && (
                      <tr>
                        <td colSpan="3">No repayments yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4>Remaining EMI Schedule</h4>

              <div className="loans-scroll">
                <table className="payroll-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>EMI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSchedule(selectedLoan).map((item) => (
                      <tr key={item.month}>
                        <td>{item.month}</td>
                        <td>{money(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <h4>Loan Audit History</h4>

          <div className="loans-history">
            {[...selectedLoan.history].reverse().map((item) => (
              <div key={item.id}>
                <strong>{item.action}</strong>
                <span>{item.details}</span>
                <small>
                  {new Date(item.date).toLocaleString()} · {item.by}
                </small>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeeLoans;
