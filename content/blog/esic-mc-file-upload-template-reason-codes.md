---
title: "ESIC MC File Upload: Free Template, Reason Codes & Common Errors (2026)"
description: "How to prepare the ESIC monthly contribution (MC) file: the six-column template (free download), all 14 reason codes, the Last Working Day rule, and why uploads get rejected - plus a free tool that checks every row before you upload."
date: "2026-10-18"
slug: "esic-mc-file-upload-template-reason-codes"
---

**Quick answer:** The ESIC monthly contribution (MC) file is a six-column Excel sheet - IP number, name, days, wages, reason code and last working day - saved as `.xls` and uploaded to the ESIC employer portal every month. [Download the blank template (.xls)](/esic-portal-template.xls) to fill in by hand, or use the free [ESIC MC Creator](/esic-mc-creator) to turn a normal spreadsheet into a portal-ready file and check every row before you upload.

## What the MC file is

Every month, an employer covered under ESI reports each Insured Person (IP) on its employer code: how many days were paid, what wages were paid and, for anyone with zero wages, why. That report is the MC file. You upload it on the ESIC employer portal, and the portal generates the challan.

Two things are worth knowing before you start:

- **You do not enter contribution amounts.** The portal calculates both the employee and the employer contribution from the wages you report.
- **Every currently mapped IP must be in the file.** The portal's own instructions say an upload succeeds only when all the employees mapped to your employer code are entered correctly. One wrong row can stop the whole file.

## The six columns

The portal's template has one data sheet with these columns, in this order:

1. **IP Number** - 10 digits.
2. **IP Name** - alphabets and spaces only.
3. **Number of days wages were paid/payable in the month** - a whole number. Fractions are rounded up to the next whole number.
4. **Total Monthly Wages.**
5. **Reason code for zero working days** - numeric only. Enter 0 for everyone who was paid.
6. **Last Working Day** - DD/MM/YYYY or DD-MM-YYYY, and only in the cases described below.

## Download the template

The portal offers a "Sample MC Excel Template" on its data-entry page, inside the employer portal, which is why it is hard to find anywhere else. For convenience, we host a copy of the blank sheet: **[Download the blank ESIC MC template (.xls)](/esic-portal-template.xls)**.

It contains the six-column data sheet and the "Instructions & Reason Codes" sheet, as supplied by the portal. We last checked it in October 2026. ESIC can change its template, so if the one on your portal looks different, use the portal's.

## The 14 reason codes

These go in column 5 (the reason for zero days). The portal's instructions split them into two groups.

**Codes that need a Last Working Day** (only when the days column is 0):

- **2 - Left Service.** The IP does not appear from the next wage period.
- **3 - Retired.** The IP does not appear from the next wage period.
- **4 - Out of Coverage.** Valid only if the wage period is April or October; in any other month the IP continues to appear. The IP does not appear from the next contribution period.
- **5 - Expired.** The IP does not appear from the next wage period.
- **6 - Non Implemented area.** A last working day is required.
- **10 - Retrenchment.** The IP does not appear from the next wage period.

**Codes where the Last Working Day must stay blank:**

- **0 - Without Reason.** Use this for everyone who was paid.
- **1 - On Leave.**
- **7 - Compliance by Immediate Employer.**
- **8 - Suspension of work.**
- **9 - Strike/Lockout.**
- **11 - No Work.**
- **12 - Doesn't Belong To This Employer.**
- **13 - Duplicate IP.**

## The Last Working Day rule most people get wrong

A last working day goes in only when **the days column is 0** and the reason code is one of 2, 3, 4, 5, 6 or 10.

If someone worked even one day in the month and then left, do not enter a last working day in that month's file. Show them as paid: days, wages, reason code 0, last working day blank. Their exit goes in the following month's file: 0 days, 0 wages, the right reason code and their actual last working day.

For example, an employee works until 12 October and is paid for 12 days. In the October file the row shows 12 days, the wages paid, code 0 and no date. In the November file it shows 0 days, 0 wages, code 2 (Left Service) and 12/10/2026.

## Why files get rejected

The portal is strict about format. From its own instructions:

- **Save as `.xls`** (Excel 97-2003). A modern `.xlsx` is not what the portal asks for.
- **Every column must be Text**, including the date column. The portal explains a "Text to Columns" fix to run on each of the six columns.
- **Dates must be padded.** 02/05/2010 or 02-05-2010 works; 2/5/2010 or 2-May-2010 does not.
- **Names** use letters and spaces only.
- **Days** are whole numbers.
- **Every mapped IP** must be present.

Three practical tips:

- Excel stores dates as numbers and shows them in your PC's regional format, so a date you typed as 19/08/2026 may appear as 19-08-2026. It looks fine on screen, but it is a date value, not Text, which is what the portal wants.
- Turn off your browser's pop-up blocker before uploading. The portal needs pop-ups to upload the file and to show the challan.
- If an upload keeps failing, download a fresh template from the portal and paste your data area into it.

## How the contribution works out

The contribution is 4% of wages: **0.75% from the employee and 3.25% from the employer**. Because the portal calculates it for you, the number worth knowing is the total, so you can check it against the challan. The wage ceiling and the rule for someone who crosses it mid-year are covered in our [ESI calculation guide](/blog/esi-calculation-guide-india).

One detail changes the total by a rupee or two: the employee share is rounded up for each person, while the employer share is added up across everyone first and rounded up once at the end. Here is an illustration with three employees (the figures are made up):

- **Priya:** wages Rs. 18,500. Employee share 138.75, rounded up to 139. Employer share 601.25.
- **Ravi:** wages Rs. 20,000. Employee share 150. Employer share 650.
- **Meena:** wages Rs. 15,250. Employee share 114.375, rounded up to 115. Employer share 495.625.

The employee total is 139 + 150 + 115 = **Rs. 404**. The employer total is 601.25 + 650 + 495.625 = 1,746.875, rounded up once to **Rs. 1,747**. Rounding each person's employer share separately would give Rs. 1,748, so how you round changes the total. The amount payable is Rs. 2,151.

The ESIC MC Creator applies this rounding and shows the totals. Always reconcile them with the challan the portal generates.

## Skip the manual work: the ESIC MC Creator

The [ESIC MC Creator](/esic-mc-creator) does the formatting and the checking for you:

- Upload your own payroll sheet, or use our simpler template where Employee Status is a dropdown of names instead of numeric codes.
- It checks every row before you download: invalid or duplicate IP numbers, names cleaned to letters and spaces, day counts against the length of the month, zero-day rows, missing or unnecessary last working days, and the April/October rule for Out of Coverage.
- It flags wages above the Rs. 21,000 limit.
- It writes a portal-ready `.xls` with text cells, reason codes and padded dates.
- It holds the download back until errors are fixed, because the portal needs every mapped IP in one file.
- It shows the employee and employer totals so you can compare them with the challan.
- It runs entirely in your browser, so your file is never uploaded to a server. It is free and needs no sign-up.

If you also file PF every month, the [PF ECR File Generator](/pf-ecr-creator) works the same way.

## FAQs

**Where can I download the ESIC MC template?**
The portal provides a "Sample MC Excel Template" on its data-entry page. You can also [download a copy of the blank template here](/esic-portal-template.xls). If the portal's version differs, use the portal's.

**Which file format does the ESIC portal accept for the MC upload?**
An Excel 97-2003 file saved as `.xls`, with every column, including the date column, in Text format.

**What reason code do I use for an employee who was paid this month?**
Code 0 (Without Reason), with the Last Working Day left blank.

**When do I enter a Last Working Day?**
Only when the days column is 0 and the reason code is 2, 3, 4, 5, 6 or 10. If the person worked even one day in the month, leave it blank.

**Can I use Out of Coverage in any month?**
No. Code 4 is valid only when the wage period is April or October. In any other month the IP continues to appear in your list.

**Do I need to calculate the contribution amounts myself?**
No. You report days and wages, and the portal calculates the employee and employer contributions. The ESIC MC Creator shows the totals so you can check them against the challan.

**Is my data safe in the ESIC MC Creator?**
Your file is read and converted inside your browser and is never sent to or stored on a PayrollTool.in server.

## Key takeaway

The MC file is simple in content but strict in format: six columns, `.xls`, everything as Text, padded dates, a reason code for every zero-day row and a last working day only where the rules allow it. Get one row wrong and the whole upload can fail. Use the [blank template](/esic-portal-template.xls) if you prefer to fill it in by hand, or let the [ESIC MC Creator](/esic-mc-creator) check and format it for you.
