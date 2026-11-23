
# Deployment

The site consists of static files only. Any web server, object storage bucket or static hosting service works.

## GitHub Pages

This documentation is published with GitHub Pages:

1. Repository → **Settings → Pages**
2. **Source:** *Deploy from a branch*, branch `main`, folder `/ (root)`
3. Keep the `.nojekyll` file in the repository root. Without it GitHub runs Jekyll, which converts `.md` files to HTML – the site could no longer fetch them.

The site is then available at `https://<owner>.github.io/<repository>/`.

### Custom domain

1. In **Settings → Pages → Custom domain** enter e.g. `docs.example.com` (GitHub adds a `CNAME` file).
2. At your DNS provider create a `CNAME` record `docs` → `<owner>.github.io.`
   For an apex domain (`example.com`) use `A`/`AAAA` records to the GitHub Pages addresses instead.
3. Enable **Enforce HTTPS** once the certificate is issued.

## Other hosts

- **Cloudflare Pages, Netlify, …** – no build command, output directory is the repository root.
- **Own server / S3** – copy the files; `.md` files can be served with any `text/*` content type.

## Recommended HTTP headers

`index.html` sets a Content Security Policy via `<meta>`. Some protections only work as HTTP headers – add them if your host allows it:

```text
Content-Security-Policy: frame-ancestors 'self'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

See [Security](?SECURITY) for details.
