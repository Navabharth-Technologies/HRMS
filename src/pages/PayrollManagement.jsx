import MonthlyPayroll from "./MonthlyPayroll.jsx";
import PayrollPolicies from "./PayrollPolicies.jsx";
import EmployeeLoans from "./EmployeeLoans";
import { useState } from "react";
import "./PayrollManagement.css";

const initialComponents = [
    { id: "basic", name: "Basic Salary", type: "Earning" },
    { id: "hra", name: "HRA", type: "Earning" },
    { id: "allowance", name: "Other Allowance", type: "Earning" },
];

const emptyAmounts = {
    basic: "",
    hra: "",
    allowance: "",
};

function formatMoney(value) {
    return "₹" + Number(value || 0).toLocaleString("en-IN");
}

function totalSalary(amounts, components) {
    return components.reduce((total, component) => {
        const amount = Number(amounts[component.id] || 0);

        return component.type === "Earning"
            ? total + amount
            : total - amount;
    }, 0);
}
function PayrollManagement({
    adminPayroll=false, monthlyProps={}, policies=[], setPolicies, isSuper, actorId, admins=[],
    employees = [],
    salaryRecords = [],
    setSalaryRecords,
    salaryComponents = initialComponents,
    setSalaryComponents,
    employeeLoans = [],
    setEmployeeLoans,
}) {
    const [tab, setTab] = useState("structures");
    const [selectedEmployee, setSelectedEmployee] = useState("");
    const [effectiveDate, setEffectiveDate] = useState("");
    const [amounts, setAmounts] = useState({});
    const [reason, setReason] = useState("");
    const [componentName, setComponentName] = useState("");
    const [componentType, setComponentType] = useState("Earning");
    const [search, setSearch] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const activeEmployees = employees.filter(
        (employee) => employee.status === "Active"
    );

    function employeeId(employee) {
        return String(employee.employeeId || employee.id || "");
    }

    function employeeName(employee) {
        return employee.name || employee.fullName || "Unnamed Employee";
    }

    function getEmployee(id) {
        return employees.find(
            (employee) => employeeId(employee) === String(id)
        );
    }

    function getHistory(id) {
        return salaryRecords
            .filter((record) => String(record.employeeId) === String(id))
            .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
    }

    function getCurrentSalary(id) {
        const today = new Date().toLocaleDateString("en-CA");

        return getHistory(id).find(
            (record) => record.effectiveDate <= today
        );
    }

    function getLatestSalary(id) {
        return getHistory(id)[0];
    }

    function clearAlerts() {
        setMessage("");
        setError("");
    }

    function resetForm() {
        setSelectedEmployee("");
        setEffectiveDate("");
        setAmounts({});
        setReason("");
    }

    function saveSalary(event) {
        event.preventDefault();
        clearAlerts();

        if (!setSalaryRecords) {
            setError("Salary state is not connected in App.jsx.");
            return;
        }

        if (!selectedEmployee || !effectiveDate) {
            setError("Select an employee and effective date.");
            return;
        }

        if (!reason.trim()) {
            setError("Enter a reason for this salary assignment or revision.");
            return;
        }

        const validEmployee = activeEmployees.some(
            (employee) => employeeId(employee) === selectedEmployee
        );

        if (!validEmployee) {
            setError("Select an active employee.");
            return;
        }

        const duplicate = salaryRecords.some(
            (record) =>
                String(record.employeeId) === selectedEmployee &&
                record.effectiveDate === effectiveDate
        );

        if (duplicate) {
            setError("A salary revision already exists for this effective date.");
            return;
        }

        const values = {};

        for (const component of salaryComponents) {
            const rawValue = amounts[component.id] ?? "";

            if (rawValue === "" || !Number.isFinite(Number(rawValue))) {
                setError("Enter an amount for every salary component.");
                return;
            }

            if (Number(rawValue) < 0) {
                setError("Salary component amounts cannot be negative.");
                return;
            }

            values[component.id] = Number(rawValue);
        }

        const netFixed = totalSalary(values, salaryComponents);

        if (netFixed <= 0) {
            setError("The total fixed salary must be greater than zero.");
            return;
        }

        const previous = getLatestSalary(selectedEmployee);

        // Keep a snapshot so old revisions stay unchanged.
        const newRecord = {
            id: crypto.randomUUID(),
            employeeId: selectedEmployee,
            effectiveDate,
            amounts: values,
            components: salaryComponents.map((component) => ({ ...component })),
            total: netFixed,
            reason: reason.trim(),
            type: previous ? "Revision" : "Initial",
            createdAt: new Date().toISOString(),
        };

        setSalaryRecords((records) => [...records, newRecord]);

        setMessage(
            previous
                ? "Salary revision saved successfully."
                : "Employee salary structure created successfully."
        );

        resetForm();
        setTab("structures");
    }

    function addComponent(event) {
        event.preventDefault();
        clearAlerts();

        if (!setSalaryComponents) {
            setError("Salary components are not connected in App.jsx.");
            return;
        }

        const name = componentName.trim();

        if (!name) {
            setError("Enter a component name.");
            return;
        }

        const exists = salaryComponents.some(
            (component) =>
                component.name.toLowerCase() === name.toLowerCase()
        );

        if (exists) {
            setError("This salary component already exists.");
            return;
        }

        const newComponent = {
            id: crypto.randomUUID(),
            name,
            type: componentType,
        };

        setSalaryComponents((components) => [
            ...components,
            newComponent,
        ]);

        setComponentName("");
        setMessage("Salary component added successfully.");
    }

    function startRevision(employee) {
        clearAlerts();

        const id = employeeId(employee);
        const latest = getLatestSalary(id);

        setSelectedEmployee(id);
        setAmounts(latest ? { ...latest.amounts } : {});
        setEffectiveDate("");
        setReason("");
        setTab("form");
    }

    const filteredEmployees = activeEmployees.filter((employee) => {
        const query = search.toLowerCase();

        return (
            employeeName(employee).toLowerCase().includes(query) ||
            employeeId(employee).toLowerCase().includes(query)
        );
    });

    return (
        <div className="payroll-page">
            <div className="payroll-header">
                <div>
                    <h1>{adminPayroll ? "Admins Payroll" : "Employee Payroll"}</h1>
                    <p>Manage salary structures, components and revisions.</p>
                </div>

                <button
                    className="payroll-primary"
                    onClick={() => {
                        clearAlerts();
                        resetForm();
                        setTab("form");
                    }}
                >
                    + Assign Salary
                </button>
            </div>

            <div className="payroll-stats">
                <div className="payroll-stat">
                    <span>Active Employees</span>
                    <strong>{activeEmployees.length}</strong>
                </div>

                <div className="payroll-stat">
                    <span>Salary Assigned</span>
                    <strong>
                        {
                            activeEmployees.filter((employee) =>
                                getCurrentSalary(employeeId(employee))
                            ).length
                        }
                    </strong>
                </div>

                <div className="payroll-stat">
                    <span>Salary Not Assigned</span>
                    <strong>
                        {
                            activeEmployees.filter(
                                (employee) => !getCurrentSalary(employeeId(employee))
                            ).length
                        }
                    </strong>
                </div>

                <div className="payroll-stat">
                    <span>Salary Components</span>
                    <strong>{salaryComponents.length}</strong>
                </div>
            </div>

            <div className="payroll-tabs">
                <button className={tab === "monthly" ? "active" : ""} onClick={() => setTab("monthly")}>Monthly Payroll</button>
                <button className={tab === "policies" ? "active" : ""} onClick={() => setTab("policies")}>Payroll Policies</button>
                <button
                    className={tab === "structures" ? "active" : ""}
                    onClick={() => setTab("structures")}
                >
                    Salary Structures
                </button>

                <button
                    className={tab === "form" ? "active" : ""}
                    onClick={() => setTab("form")}
                >
                    Assign / Revise Salary
                </button>

                <button
                    className={tab === "components" ? "active" : ""}
                    onClick={() => setTab("components")}
                >
                    Salary Components
                </button>

                <button
                    className={tab === "history" ? "active" : ""}
                    onClick={() => setTab("history")}
                >
                    Revision History
                </button>
                <button
                    className={tab === "loans" ? "active" : ""}
                    onClick={() => setTab("loans")}
                >
                    Employee Loans
                </button>
            </div>

            {message && <div className="payroll-success">{message}</div>}
            {error && <div className="payroll-error">{error}</div>}

            {tab === "monthly" && <MonthlyPayroll {...monthlyProps} {...{employees,policies,salaryRecords,isSuper,actorId}} loans={employeeLoans} setLoans={setEmployeeLoans}/> }
            {tab === "policies" && <PayrollPolicies {...{policies,setPolicies,isSuper,actorId,admins}} records={monthlyProps.records}/>}
            {tab === "structures" && (
                <div className="payroll-card">
                    <div className="payroll-card-heading">
                        <h2>Employee Salary Structures</h2>

                        <input
                            placeholder="Search employee..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>

                    <div className="payroll-table-wrap">
                        <table className="payroll-table">
                            <thead>
                                <tr>
                                    <th>Employee ID</th>
                                    <th>Employee</th>
                                    <th>Current Fixed Salary</th>
                                    <th>Effective Date</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredEmployees.map((employee) => {
                                    const id = employeeId(employee);
                                    const salary = getCurrentSalary(id);

                                    return (
                                        <tr key={id}>
                                            <td>{id}</td>
                                            <td>{employeeName(employee)}</td>
                                            <td>
                                                {salary ? formatMoney(salary.total) : "—"}
                                            </td>
                                            <td>{salary?.effectiveDate || "—"}</td>
                                            <td>
                                                <span
                                                    className={
                                                        salary
                                                            ? "payroll-pill assigned"
                                                            : "payroll-pill missing"
                                                    }
                                                >
                                                    {salary ? "Assigned" : "Not Assigned"}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    className="payroll-link"
                                                    onClick={() => startRevision(employee)}
                                                >
                                                    {getLatestSalary(id)
                                                        ? "Revise Salary"
                                                        : "Assign Salary"}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {filteredEmployees.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="payroll-empty">
                                            {adminPayroll ? "No linked administrator employee profiles found." : "No eligible employees found."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {tab === "form" && (
                <div className="payroll-card">
                    <h2>Assign / Revise Employee Salary</h2>

                    <form onSubmit={saveSalary} className="payroll-form">
                        <div className="payroll-form-grid">
                            <label>
                                Employee
                                <select
                                    value={selectedEmployee}
                                    onChange={(event) => {
                                        const id = event.target.value;
                                        const latest = getLatestSalary(id);

                                        setSelectedEmployee(id);
                                        setAmounts(latest ? { ...latest.amounts } : {});
                                    }}
                                >
                                    <option value="">Select employee</option>

                                    {activeEmployees.map((employee) => (
                                        <option
                                            key={employeeId(employee)}
                                            value={employeeId(employee)}
                                        >
                                            {employeeId(employee)} - {employeeName(employee)}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                Effective Date
                                <input
                                    type="date"
                                    value={effectiveDate}
                                    onChange={(event) =>
                                        setEffectiveDate(event.target.value)
                                    }
                                />
                            </label>
                        </div>

                        <h3>Salary Components</h3>

                        <div className="payroll-form-grid">
                            {salaryComponents.map((component) => (
                                <label key={component.id}>
                                    {component.name} ({component.type})
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="Enter amount"
                                        value={amounts[component.id] ?? ""}
                                        onChange={(event) =>
                                            setAmounts((current) => ({
                                                ...current,
                                                [component.id]: event.target.value,
                                            }))
                                        }
                                    />
                                </label>
                            ))}
                        </div>

                        <div className="payroll-total">
                            <span>Total Fixed Salary</span>
                            <strong>
                                {formatMoney(totalSalary(amounts, salaryComponents))}
                            </strong>
                        </div>

                        <label>
                            Reason for Assignment / Revision
                            <textarea
                                rows="3"
                                placeholder="Example: Initial salary assignment or annual increment"
                                value={reason}
                                onChange={(event) => setReason(event.target.value)}
                            />
                        </label>

                        <button type="submit" className="payroll-primary">
                            Save Salary Structure
                        </button>
                    </form>
                </div>
            )}

            {tab === "components" && (
                <div className="payroll-card">
                    <h2>Configure Salary Components</h2>

                    <form
                        onSubmit={addComponent}
                        className="payroll-component-form"
                    >
                        <input
                            placeholder="Component name"
                            value={componentName}
                            onChange={(event) =>
                                setComponentName(event.target.value)
                            }
                        />

                        <select
                            value={componentType}
                            onChange={(event) =>
                                setComponentType(event.target.value)
                            }
                        >
                            <option value="Earning">Earning</option>
                            <option value="Deduction">Deduction</option>
                        </select>

                        <button type="submit" className="payroll-primary">
                            Add Component
                        </button>
                    </form>

                    <div className="payroll-table-wrap">
                        <table className="payroll-table">
                            <thead>
                                <tr>
                                    <th>Component Name</th>
                                    <th>Type</th>
                                </tr>
                            </thead>

                            <tbody>
                                {salaryComponents.map((component) => (
                                    <tr key={component.id}>
                                        <td>{component.name}</td>
                                        <td>{component.type}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {tab === "history" && (
                <div className="payroll-card">
                    <h2>Salary Revision History</h2>

                    <div className="payroll-table-wrap">
                        <table className="payroll-table">
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Effective Date</th>
                                    <th>Salary</th>
                                    <th>Type</th>
                                    <th>Reason</th>
                                </tr>
                            </thead>

                            <tbody>
                                {[...salaryRecords]
                                    .sort((a, b) =>
                                        b.effectiveDate.localeCompare(a.effectiveDate)
                                    )
                                    .map((record) => {
                                        const employee = getEmployee(record.employeeId);

                                        return (
                                            <tr key={record.id}>
                                                <td>
                                                    {employee
                                                        ? employeeName(employee)
                                                        : record.employeeId}
                                                </td>
                                                <td>{record.effectiveDate}</td>
                                                <td>{formatMoney(record.total)}</td>
                                                <td>{record.type}</td>
                                                <td>{record.reason}</td>
                                            </tr>
                                        );
                                    })}

                                {salaryRecords.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="payroll-empty">
                                            No salary history available.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {tab === "loans" && (
                <EmployeeLoans
                    employees={employees}
                    loans={employeeLoans}
                    setLoans={setEmployeeLoans}
                />
            )}
        </div>
    );
}

export default PayrollManagement;
