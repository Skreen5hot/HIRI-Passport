# GitHub Pages deployment

The repository deploys a static `dist` artifact through GitHub Actions. Builds support both `/HIRI-Passport/` project hosting and `/` custom-domain hosting. Application navigation uses a hash router; service-worker scope, assets, manifest, and start URLs follow the configured base.

The default `skreen5hot.github.io/HIRI-Passport/` origin is synthetic-demo-only. Browser storage is origin-scoped, not path-isolated. Real holder material requires a dedicated verified custom domain, enforced HTTPS, and a recorded deployment security review.

Pages is configured with GitHub Actions as its source. The build job has read-only repository access. The deploy job alone receives `pages: write` and `id-token: write`, targets the protected `github-pages` environment, and uploads only `dist`. No client secret, private endpoint, or source credential may enter the repository, workflow, or bundle.
