// The one list of tools on the site. The Tools menu, the footer and the About page all read it,
// so a new tool added here appears everywhere at once. Keep the order: it is the menu order.
//   label  - short name used in the menu and footer
//   name   - longer name used on the About page
//   about  - one line for the About page (no years or counts, so it does not go stale)
//   icon   - key into the ICONS map in Header.js
const TOOLS = [
  { href: '/pf-ecr-creator', label: 'PF ECR Creator', name: 'PF ECR Creator', icon: 'pfEcr',
    about: 'prepares ECR files for upload to the EPFO Unified Portal' },
  { href: '/esic-mc-creator', label: 'ESI File Creator', name: 'ESI File Creator', icon: 'esicMc',
    about: 'builds the ESIC monthly contribution (MC) file for upload to the ESIC portal' },
  { href: '/tax-calculator', label: 'Tax Calculator', name: 'Tax Regime Calculator', icon: 'tax',
    about: 'compares the Old and New tax regimes side by side' },
  { href: '/salary-proration', label: 'Salary Proration', name: 'Salary Proration Calculator', icon: 'salaryProration',
    about: 'handles mid-month joining and exit, state-wise PT and the EPF wage ceiling' },
  { href: '/lop-splitter', label: 'LOP Splitter', name: 'LOP Splitter', icon: 'lopSplitter',
    about: 'loss-of-pay calculations across month boundaries' },
  { href: '/final-settlement', label: 'Final Settlement', name: 'Final Settlement Calculator', icon: 'finalSettlement',
    about: 'gratuity, notice pay, leave encashment and deductions in one place' },
];

module.exports = TOOLS;
