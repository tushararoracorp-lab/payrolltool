---
title: "LOP (Loss of Pay) Meaning & Calculation in India | Complete Formula Guide"
description: "Understand Loss of Pay (LOP) meaning and calculation in Indian payroll. Learn formula, common mistakes, and how LOP affects EPF, ESI, and PT deductions."
date: "2026-07-05"
slug: "how-to-calculate-lop-in-india"
---

Loss of Pay (LOP) is one of the most common sources of payroll disputes in Indian companies - not because the concept is complicated, but because there's no single standardized formula, and different companies apply different conventions inconsistently.

## What is LOP?

LOP refers to the salary deduction applied when an employee is absent without approved leave, or has exhausted their leave balance. Unlike leave encashment or approved leave, LOP days are unpaid - the employee's salary for that month is reduced proportionally.

## The core LOP formula

The most common approach:

Per Day Salary = Monthly Gross Salary / Total Days in Month
LOP Deduction = Per Day Salary × Number of LOP Days
Net Payable = Monthly Gross Salary − LOP Deduction

The tricky part is what counts as "Total Days in Month" - this is where most disputes originate.

## The three common conventions

**1. Calendar days method**
Divides salary by the actual number of days in that month (28, 29, 30, or 31). This means an employee's per-day salary - and therefore their LOP deduction - varies slightly month to month for the same number of LOP days.

**2. Fixed days method**
Some companies use a fixed denominator (commonly 30) regardless of the actual month length, to keep per-day salary consistent across months.

**3. 26-day method**
Divides salary by 26, treating a month as 26 working days with the weekly offs (about four Sundays) left out. Because the divisor is smaller, each LOP day costs more: on a monthly salary of Rs. 30,000, one LOP day is Rs. 1,154 on a 26-day basis (30,000 / 26), against Rs. 1,000 on a 30-day basis. Companies that use 26 days usually do not count weekly offs that fall inside an LOP stretch as LOP days, since the divisor already leaves them out. The number 26 is familiar from the gratuity formula (15 / 26), but for LOP it is a policy choice, not a statutory rule.

None of the three is universally "correct" - it depends on company policy, and ideally should be documented clearly in the employee handbook, since employees often notice and question why their LOP deduction differs between a 28-day February and a 31-day month.

## Common LOP calculation mistakes

- **Applying LOP to gross salary instead of specific components** - some companies apply LOP only to Basic + DA, not to fixed allowances, depending on their policy. Applying it uniformly across all components without checking policy is a frequent error.
- **Ignoring downstream impact on EPF, ESI, and Professional Tax** - LOP reduces earned wages, which in turn changes EPF wages, ESI eligibility (if it pushes gross below the ESI threshold), and PT slab in some states. Many payroll sheets calculate LOP but forget to recalculate these downstream statutory deductions.
- **Weekly offs and holidays during LOP periods** - if an employee is on LOP for a stretch that includes a weekly off or a paid holiday, policies differ on whether that off day is also treated as LOP or excluded. This needs to be explicit, not assumed.
- **Manual formula drift across months** - when LOP is calculated in a fresh Excel sheet every month, small formula inconsistencies creep in, especially when new joiners or mid-month exits are involved.

## Why LOP disputes happen

Most LOP-related employee complaints aren't about the concept - they're about *transparency*. An employee who sees a different per-day deduction rate in March versus April, without understanding why, will assume an error even if the calculation followed policy correctly. Clear payslip breakdowns that show the per-day rate and days deducted go a long way in preventing these disputes.

## Simplifying LOP calculation

The part most likely to go wrong before the deduction is even calculated is an absence that crosses a month boundary. An absence from 28 March to 3 April has to be split into two entries, one for each payroll month, so that each month's LOP uses that month's own day count. Our [LOP Splitter](/lop-splitter) does exactly this: it splits each employee's LOP period into HRMS-ready date rows by month, and flags overlapping absence records so the same day is never deducted twice. The deduction itself, and the EPF, ESI and PT recalculation that follows it, stay with your payroll system.

## Key takeaway

LOP itself is simple math - the complexity comes from consistency (calendar days, 30 or 26), correctly identifying which salary components it applies to, and remembering its downstream effect on statutory deductions.
