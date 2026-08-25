# TOEFL Tracker Deployment Notes

## Current Architecture

This project is deployed as a static Vite React app.

- Local project path: `E:\Project\TOEFL\toefl-tracker`
- Build command: `npm run build`
- Build output: `dist/`
- Server SSH alias: `aliyun_shiyo`
- Server web root: `/www/wwwroot/toefl.shiyo.top`
- Public URL: `http://toefl.shiyo.top:8083/`
- Web server: BT/aaPanel Nginx
- Nginx binary: `/www/server/nginx/sbin/nginx`

The production server does not need Node.js for this app. Nginx only serves the generated files in `dist/`.

## Local Development

Run the Vite dev server on local port 3000:

```bash
npm run dev
```

Build static production files:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run start
```

## Deployment Flow

1. Build locally:

```bash
npm run build
```

2. Package the contents of `dist/`:

```powershell
Compress-Archive -Path .\dist\* -DestinationPath .\toefl-vite-dist.zip -Force
```

3. Upload the package to the server:

```powershell
scp .\toefl-vite-dist.zip aliyun_shiyo:~/toefl-vite-dist.zip
```

4. Extract it into the BT web root:

```bash
ssh aliyun_shiyo "python3 -m zipfile -e ~/toefl-vite-dist.zip /www/wwwroot/toefl.shiyo.top"
```

This overwrites files with the same names. Old hashed assets may remain in `/www/wwwroot/toefl.shiyo.top/assets`, but they are harmless because `index.html` points to the latest generated asset names.

## Nginx / BT Notes

The BT site root is:

```text
/www/wwwroot/toefl.shiyo.top
```

The site currently listens on port `8083`. Port `8083/tcp` has been opened in:

- Alibaba Cloud security group
- server `firewalld` public zone

The site is currently static and does not require reverse proxy. Reverse proxy was considered earlier only when a process was running on local port 3000, but the current deployment serves `dist/` directly through Nginx.

Do not delete `/www/wwwroot/toefl.shiyo.top/.user.ini`; it is managed by BT and may have protected permissions.

Useful Nginx checks:

```bash
sudo /www/server/nginx/sbin/nginx -t
sudo /www/server/nginx/sbin/nginx -s reload
```

## Data Model

This is currently a static browser-only app.

Stored in browser `localStorage`:

- user accounts
- username
- password hash
- avatar data URL
- login session
- TOEFL mock test records

Important keys:

```text
toefl-tracker-users-v1
toefl-tracker-session-v1
toefl-tracker-attempts-v2:<userId>
toefl-tracker-attempts-v1
```

`toefl-tracker-attempts-v1` is the legacy global record key. When the first user logs in or registers, old records can be migrated into that user account.

Because data is in `localStorage`, accounts and records are local to the current browser/device. For real multi-device login, shared records, and stronger password security, this app needs a backend database and server-side authentication.

## Current App Features

- Register and login pages
- Username and password
- Avatar upload
- Change avatar after login
- Logout
- Mock test records bound to the logged-in user
- Add, duplicate, reset, and delete mock test records
- Reading task types default to one item per type, with user-added extra items when a mock test contains multiple questions of the same type
- Reading section analytics average scores within the same task type before calculating section progress
- Section progress dashboard
- Score entry by TOEFL task
- Growth analysis
- Scoring rules page

## Scoring Model

Each score input is a 0-30 practice performance score, not an official raw item score.

The app groups entries by TOEFL task type first. If multiple entries share the same task type, their 0-30 scores are averaged before section scoring.

Section estimates use TOEFL raw-score weights:

- Reading Router + Upper: Complete the Words 20, Read in Daily Life 5, Read an Academic Passage 10
- Reading Router + Lower: Complete the Words 20, Read in Daily Life 10, Read an Academic Passage 5
- Listening Router + Upper: Listen and Choose a Response 11, Conversation 8, Announcement 4, Academic Talk 12
- Listening Router + Lower: Listen and Choose a Response 15, Conversation 8, Announcement 8, Academic Talk 4
- Speaking: Listen and Repeat 35, Take an Interview 20
- Writing: Build a Sentence 10, Write an Email 5, Academic Discussion 5

For `Mixed practice`, Reading and Listening use the average of Upper and Lower weights as a practice-only estimate.

The estimated 0-30 section score is then mapped to the TOEFL 2026 section band lookup table. Overall is the average of available section bands rounded to the nearest 0.5.

## Build Output Shape

A normal Vite build produces a small `dist/` directory, for example:

```text
dist/
  index.html
  favicon.svg
  assets/
    index-*.js
    index-*.css
```

This is expected. Source files such as `app/page.tsx` and `src/main.tsx` are bundled into `assets/index-*.js`; they should not appear separately in `dist/`.
