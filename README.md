# maccaconsulting
Macca Consulting Website

Big Phil’s Tree Service client-review prototype: https://mcmillantendering.com.au/big-phils/

The `big-phils/` folder is a self-contained static review export with demo-only
enquiries and clearly labelled unconfirmed business details. Every prototype
page has noindex metadata; root `robots.txt` excludes `/big-phils/`. Keep the
prototype out of the sitemap and keep its final domain unconnected.

To update from the separate local Big Phil’s source project, run
`node scripts/export-subpath.mjs`, then replace this folder with the contents of
`review-export/big-phils/`. Publish the compiled review files only. The standard
Cloudflare/Vercel root deployment remains available from that source project.
