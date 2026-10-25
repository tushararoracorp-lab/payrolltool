// One place for every page's SEO text. Pages read from here, so titles, FAQs and schema never drift apart.
// Run `node scripts/check-seo.js` after editing: it fails on over-long titles, thin or long answers, duplicates.
// "reviewed" is the date a human last checked the facts on that page; update it when you re-verify.
const REVIEWED = '2026-10-23';

module.exports = {
  '/': {
    title: 'PayrollTool.in: Free Payroll Calculators for India',
    description: 'Free browser-based payroll calculators and statutory compliance updates for Indian HR and payroll teams. No sign-up required.',
    schema: ['organization', 'website'],
  },

  '/esic-mc-creator': {
    title: 'ESI File Creator: ESIC MC File Generator from Excel (Free)',
    description: 'Upload your ESI sheet and generate the ESIC monthly contribution (MC) file in the portal format. Free, runs in your browser. Template included.',
    h1: 'ESI File Creator: generate the ESIC monthly contribution (MC) file from Excel',
    answer: 'The ESI File Creator turns your payroll Excel sheet into the ESIC monthly contribution (MC) file in the format the ESIC employer portal accepts. Upload the sheet, review the checks, download the file and upload it on the portal under File Monthly Contribution. ESI contributions are due by the 15th of the following month.',
    reviewed: REVIEWED,
    related: 'esic',
    features: ['Generates the ESIC monthly contribution (MC) Excel file', 'Checks IP number, days, wages and reason codes', 'Free, no sign-up'],
    howTo: {
      name: 'How to create the ESI (ESIC MC) file',
      description: 'Create the monthly contribution file and upload it on the ESIC portal.',
      // These four steps must match the steps shown on the page. Edit both together.
      steps: [
        { name: 'Prepare your sheet', text: 'Fill the IP number, IP name, days worked, total monthly wages, reason code and last working day for each insured person.' },
        { name: 'Upload it in the tool', text: 'Upload the sheet in the ESI File Creator and review the checks it shows.' },
        { name: 'Download the ESIC MC file', text: 'Download the generated file without changing its headings or column order.' },
        { name: 'Upload it on the ESIC portal', text: 'Log in to the ESIC employer portal, choose File Monthly Contribution, select the month, choose Upload Excel and upload the file. Then generate the challan and pay by the 15th.' },
      ],
    },
    faqs: [
      { q: 'What is an ESI file?', a: "An ESI file is the monthly contribution (MC) Excel sheet an employer uploads on the ESIC portal each month. It lists each insured person's IP number, name, days worked and wages, plus a reason code and last working day where relevant. ESIC uses it to calculate contributions and generate the challan." },
      { q: 'How do I upload the ESIC Excel file?', a: "Log in to the ESIC employer portal, choose File Monthly Contribution, select the wage month, then choose Upload Excel and browse to your file. Review the contribution history page, generate the challan and pay by the 15th of the following month. Use the sample template from the portal's own link." },
      { q: 'What columns does the ESI file have?', a: "ESIC's sample MC template has six columns: IP number, IP name, days for which wages were paid or payable, total monthly wages, reason code for zero working days, and last working day. Always download the latest sample template from the ESIC portal and keep its headings and order unchanged." },
      { q: 'When is the ESI contribution due and at what rate?', a: 'The contribution for a month is due by the 15th of the following month. The rates are 3.25% from the employer and 0.75% from the employee on wages up to Rs 21,000 a month (Rs 25,000 for persons with disability), and they continue under the Code on Social Security, 2020.' },
    ],
  },

  '/blog/esic-mc-file-upload-template-reason-codes': {
    title: 'ESI File Format: ESIC MC Template, Columns and Reason Codes',
    description: 'What goes in an ESI (ESIC MC) file: the columns, wage and days rules, reason codes for zero working days and the steps to upload it on the ESIC portal.',
    h1: 'ESI File Format: ESIC MC Template, Columns and Reason Codes',
    answer: 'The ESI file, also called the ESIC MC file, is the monthly contribution Excel sheet uploaded on the ESIC employer portal. Each row is one insured person: IP number, name, days worked, total monthly wages, a reason code for zero working days and the last working day. Keep ESIC\'s headings and column order unchanged.',
    reviewed: REVIEWED,
    related: 'esic',
    datePublished: '2026-10-18',
    faqs: [
      { q: 'What is the ESI file format?', a: "The ESI file format is ESIC's monthly contribution (MC) Excel template. Each row holds one insured person's IP number, name, days worked, total monthly wages, a reason code where days are zero, and the last working day. Download the latest sample template from the ESIC portal and keep its headings and order." },
      { q: 'What are the reason codes in the ESI file?', a: 'The reason code explains why an insured person has zero working days in the month. It is numeric, and 0 is used where there is no reason to report. Use the code list shown on the ESIC portal beside the sample template, and add the last working day when the person has left.' },
      { q: 'How do I upload the ESI file?', a: 'Log in to the ESIC employer portal, choose File Monthly Contribution, select the wage month, choose Upload Excel and upload your file. Check the contribution history page, then generate the challan and pay by the 15th of the following month.' },
    ],
  },

  '/blog/pf-ecr-file-format': {
    title: 'EPF ECR Format in Excel 2026-27: Template and File Rules',
    description: 'The EPF ECR file format for 2026-27: field order, wage rules, Excel template and the validation errors that cause upload failures.',
    h1: 'EPF ECR File Format 2026-27: Excel Template and File Rules',
    answer: 'ECR stands for Electronic Challan cum Return, the monthly file employers upload on the EPFO Unified Portal. It is a text file with one line per member, fields separated by #~#. EPS and EDLI wages are capped at the wage ceiling, Rs 25,000 from 17 September 2026, and EPF wages too unless the employer contributes on higher wages.',
    reviewed: REVIEWED,
    related: 'pf-ecr',
    faqs: [
      { q: 'What is ECR in PF?', a: 'ECR stands for Electronic Challan cum Return. It is the monthly file an employer uploads on the EPFO Unified Portal with each member\'s UAN, wages and contributions. EPFO uses it to create the challan for payment. It is a text file in a prescribed format, which an Excel sheet can be converted into.' },
      { q: 'What fields does the ECR text file have?', a: 'Each line is one member, with fields separated by #~#: UAN, member name, gross wages, EPF wages, EPS wages, EDLI wages, EPF contribution, EPS contribution, employer EPF-EPS difference, NCP days and refund of advances. Confirm the order against your current EPFO template before uploading.' },
      { q: 'Which wage ceiling applies in the ECR for 2026-27?', a: 'EPS and EDLI wages in the ECR are capped at the wage ceiling, and EPF wages too unless the employer contributes on higher wages: Rs 15,000 up to 16 September 2026 and Rs 25,000 from 17 September 2026 (S.O. 5109(E)). The September 2026 return uses both, with 1 to 16 September on Rs 15,000 and 17 to 30 September on Rs 25,000.' },
    ],
  },

  '/blog/gratuity-eligibility-4-years-240-days': {
    title: 'Gratuity Eligibility 2026: 4 Years 240 Days, 1-Year Rule',
    description: 'Who gets gratuity: the 4 years 240 days rule, the 5-year rule, and gratuity for fixed-term employees after one year under the Labour Codes, with formula.',
    h1: 'Gratuity Eligibility: 4 Years 240 Days Explained',
    answer: 'Four years and 240 days is about 4 years 8 months, or 56 months. Under section 54 of the Code on Social Security, which replaced section 2A of the Payment of Gratuity Act, a year of continuous service means 240 days worked, or 190 days where the establishment works fewer than six days a week. Fixed-term employees qualify after one year.',
    reviewed: REVIEWED,
    faqs: [
      { q: 'How many months is 4 years 240 days?', a: 'About 56 months: 4 years is 48 months and 240 days is about 8 months at 30 days a month. Under section 54 of the Code on Social Security, which replaced section 2A of the Payment of Gratuity Act, a year of continuous service means 240 days worked, or 190 days in a five-day establishment.' },
      { q: 'What does 4 years and 190 days mean for gratuity?', a: 'In an establishment that works fewer than six days a week, 190 days of work counts as a year of continuous service. So 4 years and 190 days applies the same test as 4 years and 240 days in a six-day establishment, and 190 days is roughly 6 months, giving about 4 years 6 months of service.' },
      { q: 'When do fixed-term employees get gratuity?', a: "Under section 53 of the Code on Social Security, 2020, in force from 21 November 2025, a fixed-term employee is entitled to gratuity after one year of continuous service, on a pro-rata basis, instead of five years. The formula is 15 days' wages for each completed year, divided by 26." },
      { q: 'How is gratuity calculated?', a: 'Gratuity = last drawn wages x 15 x completed years of service / 26. For example, wages of Rs 40,000 and 6 years of service give 40,000 x 15 x 6 / 26 = about Rs 1,38,462. The maximum is the amount notified by the Central Government, which remains Rs 20 lakh.' },
    ],
  },

  '/blog/salary-proration-india': {
    title: 'Prorated Salary and CTC: Meaning, Formula and Examples',
    description: 'How to prorate salary for joiners, leavers and loss of pay: calendar-day, 26-day and 30-day methods with worked examples and a free calculator.',
    h1: 'Prorated Salary and CTC in India: Meaning, Formula and Examples',
    answer: "Prorated salary is the part of a month's or year's pay an employee earns for the days actually worked or in service. For example, a monthly salary of Rs 30,000 prorated for 10 days of a 30-day month is Rs 10,000. Prorated CTC applies the same idea to an annual package for joiners and leavers.",
    reviewed: REVIEWED,
    related: 'salary',
    faqs: [
      { q: 'What does prorated salary mean?', a: "Prorated salary means paying only for the part of the pay period an employee was in service or at work. It is the monthly salary divided by the days in the period, multiplied by the days worked. For Rs 30,000 and 10 days in a 30-day month, the prorated salary is Rs 10,000." },
      { q: 'What is prorated CTC?', a: 'Prorated CTC is the annual cost-to-company scaled to the period an employee is in service in the year, for example 8 of 12 months. A Rs 12 lakh CTC for 8 months is Rs 8 lakh, with each component such as basic, HRA and employer PF prorated the same way.' },
      { q: 'Should I divide by 30, 26 or the calendar days?', a: 'Use the divisor your policy states: the calendar days in the month, a fixed 30, or 26 working days. The calendar-day method is the fairest for joiners and leavers. For Rs 30,000 and 10 days in a 31-day month, 30,000 / 31 x 10 gives Rs 9,677.' },
    ],
  },

  '/blog/how-to-calculate-lop-in-india': {
    title: 'LOP (Loss of Pay): Meaning, Formula and Calculation',
    description: 'Loss of pay explained: the LOP formula, per-day salary on 26, 30 or calendar days, worked examples and a free LOP splitter for payroll teams.',
    h1: 'LOP (Loss of Pay) in India: Meaning, Formula and Calculation',
    answer: 'Loss of pay (LOP) is the salary deducted for days of unpaid leave. LOP amount = monthly salary / divisor x LOP days, where the divisor is the calendar days in the month, 30 or 26 as your policy states. Example: Rs 30,000 salary, 3 LOP days, 30-day basis, deduction Rs 3,000.',
    reviewed: REVIEWED,
    related: 'salary',
    faqs: [
      { q: 'What is LOP in salary?', a: 'LOP, or loss of pay, is the amount deducted from salary for days an employee was absent without paid leave. The employee receives pay only for the days paid. LOP days also reduce the wages on which PF and ESI are calculated for that month.' },
      { q: 'How is LOP calculated?', a: 'LOP amount = monthly salary / divisor x LOP days. With a salary of Rs 30,000, 3 LOP days and a 30-day basis, the deduction is 30,000 / 30 x 3 = Rs 3,000. Use the same divisor as your policy: calendar days, 30 or 26.' },
      { q: 'Does LOP affect PF?', a: 'Yes. PF is calculated on wages actually earned, so LOP days reduce EPF wages. In the ECR the unpaid days are reported as NCP (non-contributory period) days, and the contribution is worked out on the reduced wages, subject to the wage ceiling.' },
    ],
  },

  '/blog/final-settlement-calculator': {
    title: 'FNF Calculator: Final Settlement, Gratuity and Notice Pay',
    description: 'How a full and final (FNF) settlement is calculated in India: gratuity, leave encashment and notice pay shortfall, with formulas and worked examples.',
    h1: 'FNF Calculator: Full and Final Settlement in India',
    reviewed: REVIEWED,
    related: 'salary',
  },
};
