# CDN folder structure for federated modules

Production modules are deployed to versioned CDN paths:

```
cdn.nidus.com/
└── modules/
    ├── planning-hub/
    │   ├── v1.0.0/
    │   │   ├── assets/
    │   │   │   └── remoteEntry.js
    │   │   └── health.json
    │   └── latest/          ← short TTL pointer (max-age=60)
    ├── risk-module/
    │   └── v1.0.0/
    └── … (one folder per module)
```

## Rollback

Point `VITE_MODULE_<NAME>_URL` to a previous version path, e.g.:

`https://cdn.nidus.com/modules/planning-hub/v1.0.0`

No shell redeploy required when using runtime URL injection; optional shell env update for permanent rollback.

## Local development

Module dev servers serve `remoteEntry.js` at:

`http://localhost:<port>/assets/remoteEntry.js`

See `Documentation/Module_Federation_Dev_Guide.md` for port registry.
