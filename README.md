# DELTAX5

An independent Flask website for the DELTAX5 creative brand. It uses server-rendered Jinja templates, CSS, and vanilla JavaScript. Its signature effects include a pointer-responsive perspective terrain mesh, layered 3D tilt, magnetic links and buttons, and a restrained refractive glass surface. Effects fall back to static artwork on touch, reduced-motion, and older browser paths. The project gallery is intentionally empty until real projects and media are added.

## Requirements

- Windows 11 or another supported Python environment
- Python 3.11 or newer
- SMTP details for sending project enquiries

The production dependency list is in `requirements.txt`. Test tooling is in `requirements-dev.txt`.

## Windows PowerShell setup

Open PowerShell in this folder and run:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements-dev.txt
Copy-Item .env.example .env
```

Generate a local secret key:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Put the generated value in `.env` as `FLASK_SECRET_KEY`. The local application can render pages without SMTP, but the enquiry form will explicitly say that it did not send a message until SMTP is configured.

Start the local development server:

```powershell
python run.py
```

Open `http://127.0.0.1:5000`. To run without activating the environment, use:

```powershell
.\.venv\Scripts\python.exe run.py
```

## Environment variables

| Variable | Purpose |
| --- | --- |
| `APP_ENV` | `development` locally; set to `production` on the host. |
| `FLASK_SECRET_KEY` | Random secret used to sign sessions and CSRF tokens. Never commit it. |
| `SITE_URL` | Public base URL, without a trailing slash. Set the real HTTPS domain before launch. |
| `ROBOTS_ALLOW_CRAWLING` | `false` blocks compliant crawlers by default; set `true` when the public site is ready for search discovery. |
| `MAIL_SERVER` | SMTP host. |
| `MAIL_PORT` | SMTP port; commonly 587 for STARTTLS or 465 for implicit SSL. |
| `MAIL_USE_TLS` | Use STARTTLS. Set `false` when using implicit SSL. |
| `MAIL_USE_SSL` | Use implicit SSL. Do not enable alongside TLS. |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | SMTP authentication when required by the mail provider. |
| `MAIL_FROM` | Sender address approved by the SMTP provider. |
| `MAIL_TO` | Destination inbox for enquiries. |
| `RATELIMIT_STORAGE_URI` | `memory://` for local use. Production must use shared storage such as a private Redis URL. |
| `PROXY_FIX_ENABLED` / `PROXY_FIX_X_FOR` | Enable only behind a known, trusted proxy and set the exact number of trusted proxy hops. |

The form validates submissions on the server, uses CSRF protection, and rate-limits POSTs. Email delivery is synchronous with a short timeout. Submitted enquiries are not stored in a database or logged. A success message appears only after the SMTP server accepts the message. SMTP acceptance does not guarantee final inbox delivery.

## Adding portfolio work

Add only real work that is ready to share to `app/content/projects.py`. Each published item needs a unique `slug`, `title`, `category`, `summary`, `description`, and accurate `alt_text`. Use a supplied local poster under `app/static/images/` or a verified YouTube video ID. Add `status: "published"` only when the work is approved for public display. The project gallery and sitemap automatically include published items.

Do not use placeholder entries as if they were completed projects. The current archive empty state is intentional.

## Updating service status

The service catalog is in `app/content/services.py`. `available` entries appear in the enquiry form; `developing` entries are displayed as not bookable; `draft` entries should not be shown. Keep descriptions and deliverables within the actual service scope. Current status assignments are conservative: CapCut video editing, Canva graphic design, and their defined social-content combination are available; cinematic storytelling, motion/VFX, and web development are marked in development.

## Tests

Run the automated checks from this directory:

```powershell
python -m pytest
```

The suite checks public routes, SEO endpoints, security headers, CSRF, form validation, non-delivery when SMTP is missing, and successful delivery handling with a mocked mail service.

## Production deployment

Use a production WSGI server, terminate HTTPS at the host or reverse proxy, and configure the variables above in the host’s secret manager. Do not use `python run.py` or Flask debug mode as the production server.

For a Linux host with Gunicorn, a typical start command is:

```sh
gunicorn --workers 2 --bind 0.0.0.0:${PORT:-8000} 'app:create_app()'
```

Before launch:

1. Set `APP_ENV=production`, a high-entropy `FLASK_SECRET_KEY`, the final `SITE_URL`, and SMTP values.
2. Set `ROBOTS_ALLOW_CRAWLING=true` only when the public site is ready for search discovery; it is `false` by default.
3. Set `RATELIMIT_STORAGE_URI` to a private Redis service URL so rate limits are shared across workers. The Redis extra is included with Flask-Limiter.
4. If the host uses a reverse proxy and does not pass the client address directly, enable `PROXY_FIX_ENABLED` and set `PROXY_FIX_X_FOR` to the exact trusted proxy hop count. Never enable it when untrusted clients can directly reach the app.
5. Ensure HTTPS is active; production responses set secure cookies and HSTS.
6. Confirm the configured sender is authorized by the SMTP provider and deliverability records are set at the mail domain.
7. Add approved portfolio media and verify image rights, alt text, page metadata, and the live sitemap.

The app sends mail without retaining inquiry content. If durable inquiry management is later required, add an explicit retention policy and SQLite storage before changing that behavior.

## Project structure

```text
app/
  content/       Service catalog and published portfolio data
  routes/        Public pages, enquiries, and SEO endpoints
  services/      SMTP delivery
  static/        CSS, JavaScript, and original brand SVGs
  templates/     Accessible page templates and shared components
  forms.py       Server-side enquiry validation
config.py        Environment-backed settings
run.py           Windows-friendly local development entry point
```
