Code batch 2 - unzip into C:\Coder\lop-splitter (overwrites the listed files)

Changed: src/pages/salary-proration.js, final-settlement.js, lop-splitter.js, pf-ecr-creator.js, esic-mc-creator.js, tax-calculator.js,
src/components/updates/markup.js, public/blog-meta.json, content/blog/professional-tax-india-state-wise-guide.md, how-to-calculate-lop-in-india.md
New: content/blog/minimum-wages-october-2026.md, professional-tax-due-dates-by-state.md, labour-welfare-fund-india.md

1) Local check
npm run build
npm run start      (open /salary-proration, /final-settlement, /lop-splitter, /pf-ecr-creator, /esic-mc-creator, /tax-calculator, /updates and the 3 new /blog/ pages, light and dark)

2) Staging (after you OK it locally)
git checkout staging
git add -A
git commit -m "Phase 3: salary proration guide and FAQ, common mistakes on tool pages, HR wording on final settlement, PT guide refresh, 3 new articles"
git push origin staging

3) Main (after UAT)
git checkout main
git merge --ff-only staging
git push origin main
