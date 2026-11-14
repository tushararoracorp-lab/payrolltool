Batch G data - run from C:\Coder\lop-splitter after unzipping into it (adds scripts\make-replace-at.js and files in requests\)

1) DEV (one PowerShell window, paste as one block)
$env:PROD_DATABASE_URL = 'DEV string'
$env:SUBMITTED_BY = 'tushararora679@gmail.com'
node scripts/notice-requests.js requests/g1-notices-spec.json
node scripts/make-replace-at.js requests/g1-mw-notes-spec.json
node scripts/make-replace.js mw_rate "Punjab" requests/punjab-mw-patch.json
node scripts/make-replace.js mw_rate "Bihar" requests/bihar-mw-patch.json
node scripts/make-replace.js pt_rule "Mizoram" requests/mizoram-pt-patch.json
node scripts/make-replace.js pt_rule "Tamil Nadu" requests/tamil-nadu-pt-patch.json
node scripts/make-replace.js lwf_rule "Kerala" requests/kerala-lwf-patch.json
node scripts/apply-direct.js requests/g1-notices-request.json requests/g1-mw-notes-request.json requests/punjab-mw_rate-request.json requests/bihar-mw_rate-request.json requests/mizoram-pt_rule-request.json requests/tamil-nadu-pt_rule-request.json requests/kerala-lwf_rule-request.json requests/g1-new-request.json
(type APPLY when asked)

2) PRODUCTION (after the dev pages look right) - same block, with the production string and the key:
$env:PROD_DATABASE_URL = 'PRODUCTION string'
$env:SUBMIT_API_KEY = 'your key'
$env:SUBMITTED_BY = 'tushararora679@gmail.com'
...then the same 8 node lines as above...
Remove-Item Env:PROD_DATABASE_URL, Env:SUBMIT_API_KEY

Expected: 6 notices REPLACE, 14 history-note REPLACEs, Punjab + Bihar MW REPLACE, Mizoram + Tamil Nadu PT, Kerala LWF, 1 ADD (Jharkhand 1 Oct 2026). Notification count stays 100.
