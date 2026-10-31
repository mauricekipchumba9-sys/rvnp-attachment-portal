# RVNP Industrial Attachment Portal

Students download their attachment letter and personal accident insurance cover.
The admin manages courses, insurance policy details, student lists and cover requests.

## Files (all 10 must be at the top level, not inside a sub-folder)

| File | Purpose |
|---|---|
| index.html | Student page (attachment letter and insurance cover) |
| admin.html | Admin page (open at `your-site/admin.html`) |
| api.mjs | Server code: search, requests, admin, storage |
| netlify.toml, package.json | Netlify settings |
| letterhead.png, signature.png, iso.png | Images printed on the letter |
| cover_bg.jpg, cover_font.ttf | Background and font for the insurance cover |

## Put the files on GitHub (do this first)

1. Unzip MKLETTERS_Portal_Flat.zip. Open the folder and check the 10 files are directly inside.
2. Sign in at github.com (free account).
3. Tap **+**, then **New repository**. Use any name (for example `rvnp-attachment-portal`), choose **Private**, then **Create repository**.
4. Tap **uploading an existing file**, then **choose your files**. Select all 10 files (not the folder, not the zip). On a phone, turn on **Desktop site** in your browser first. Upload in batches if needed.
5. Check that all 10 files are listed, then tap **Commit changes**.

To update later: open the repository, **Add file**, then **Upload files**. Files with the same name replace the old ones.

## Connect GitHub to Netlify

**Keep your current site (keeps students, courses and settings):**
1. Netlify: open your site, then **Site configuration**, **Build & deploy**, **Continuous deployment**, **Link repository**.
2. Choose GitHub, allow access, select your repository.
3. Leave the build command empty. Keep the publish directory as `.`. Save.
4. **Deploys**, **Trigger deploy**, **Deploy site**. Wait for **Published**.

**New site instead (new link, empty data):**
1. **Add new site**, **Import an existing project**, GitHub, pick the repository, leave the build command empty, **Deploy**.
2. **Site configuration**, **Environment variables**: add `ADMIN_PASSWORD`, then redeploy.
3. Upload students and courses again from the admin page.

## After deploying

1. Make sure `ADMIN_PASSWORD` exists under **Site configuration**, **Environment variables**. If you change it, redeploy.
2. Open `your-site/admin.html` and sign in.
3. **Insurance covers**: check the default policy number, insurer, start and end dates and issue date. Upload the student list (Class code, Student name, Admission number). "Add new and update existing" keeps what is already there. "Replace the whole list" removes anyone not in the file.
4. **Attachment letters**: check each course's title, percentage and units. Use **+ Add a course** for a new course, then **Save courses**.
5. Test on a phone: download a letter and compare it with the preview, search a student and download a cover, and send a test cover request.
6. Share the student link (copy or WhatsApp button on the admin page).

## Students and insurance covers

- Students type 3 or more letters of their name or admission number and pick themselves from the suggestions to download their cover.
- Anyone who types 3 letters can see matching students' names, admission numbers and classes. Upload only students who should be findable this way.
- Students not on the list can send a request with full name, class, course and admission number.

## Handling cover requests

1. Admin page, **Cover requests** tab (the counter shows how many are waiting).
2. Each request has two buttons under the student's name:
   - **Approve**: opens a small box. Leave "This student is on a different policy" unticked to use the default policy, or tick it and enter that student's own policy number, date of issue, start date and expiry date. Press Approve. The student moves to the students list and can download their cover straight away.
   - **Remove**: deletes the request.
3. **Approve all (default policy)** approves every waiting request at once.
4. You can still upload a finished Excel/CSV list under **Insurance covers**. Requests for students on that list clear automatically.

## Students on a different policy

By default every cover uses the policy details saved on the **Insurance covers** tab (policy number, issue date, start, expiry). Some students can have their own:
- **When approving** a request, tick the "different policy" box (see above).
- **For a student already on the list**: press **Policy** under their name, tick the box, enter their details and Save. Untick the box and Save to go back to the default.
- **By upload**: add any of these optional columns to your Excel/CSV: `Policy number`, `Issue date`, `Start date`, `Expiry date` (day/month/year). Leave them blank for students on the default policy. Uploading again without these columns keeps any custom policy already saved.
- The student's cover (and the policy number in their attachment letter) then shows their own policy. The layout never changes.
- **Download list (CSV)** includes these columns, so you can keep a full record.

## Troubleshooting

- **Old version still showing:** open the site in a private tab or hard refresh.
- **Admin sign-in fails:** check `ADMIN_PASSWORD`, then redeploy.
- **Search or requests do nothing:** api.mjs was not deployed. Check it is in the repository at the top level.
- **No "Link repository" button:** open **Continuous deployment** and check what it says, or create a new site from GitHub (see above).
- **Letter PDF differs from preview:** use an up-to-date browser and report which phone and browser you used.
