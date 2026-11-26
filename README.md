# HRMS — frontend demonstration

React JSX / Vite. Run `npm install`, `npm run dev`, `npm run build` and `node --test tests/*.test.js` from the project root.

## Workflow
Super Admin manages administrators, roles, employee ownership, shifts, salary structures and payroll policies. Employees are records, not login accounts. Employee Payroll and Admins Payroll are separate views. Attendance simulation is for demonstration; actual biometric integration is pending. Generate provisional monthly payroll, resolve attendance explicitly, recalculate and approve only after the period ends. Mark approved payroll paid with a reference. Preview payslips inside HRMS; approved slips can be downloaded as PDF. Monthly records can be exported as CSV or XLSX. Provisional amounts are not final salary.

## Storage and limitations
Browser localStorage is the current persistence layer. Download a backup before updating; clearing browser storage may remove records. Frontend role checks are not server authorization. Backend, SQLite, biometric integration, atomic financial settlement, complete CL ledger, historical unprocessed-period automation and paid salary adjustment workflow remain pending. Do not use for actual salary disbursement until those controls and end-to-end tests are completed.
