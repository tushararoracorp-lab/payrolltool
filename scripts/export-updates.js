// Read-only: saves everything the /updates pages show into updates-export.json, so it can be reviewed.
// Nothing in the database is changed. Run from the project folder:
//   node --env-file=.env.local scripts/export-updates.js
const fs = require('fs');
const { buildPublicData } = require('../src/lib/updates/publicData');

buildPublicData()
  .then((data) => {
    fs.writeFileSync('updates-export.json', JSON.stringify(data, null, 1));
    console.log('Saved updates-export.json');
    console.log('Notifications:', data.feed.length, '| PT states:', data.pt.rows.length, '| LWF states:', data.lwf.rows.length, '| Minimum wage states:', data.mw.length);
    process.exit(0);
  })
  .catch((e) => {
    console.error('Export failed:', e.message);
    process.exit(1);
  });
