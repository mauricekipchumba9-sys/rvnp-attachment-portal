# RVNP Industrial Attachment Portal

Students download their attachment letter and personal accident insurance cover.
The admin manages courses, insurance policy details, student lists and cover requests.

## Files (all 14 must be at the top level, not inside a sub-folder)

| File | Purpose |
|---|---|
| index.html | Student page (attachment letter and insurance cover) |
| admin.html | Admin page (open at `your-site/admin.html`) |
| register.html | Page where students fill in their name, admission number, class and contact number (`your-site/register.html`) |
| ilo.html | Page for ILO representatives of departments: units and insurance (open to all), student marks and notices (access code needed) (`your-site/ilo.html`) |
| hod.html | Page for the ILO HOD / Deputy HOD to assign trainers to placed students and post official notices. Opened only through the secret link from the admin page |
| api.mjs | Server code: search, requests, admin, storage |
| netlify.toml, package.json | Netlify settings |
| letterhead.png, signature.png, iso.png | Images printed on the letter |
| cover_bg.jpg, cover_font.ttf | Background and font for the insurance cover |

## Put the files on GitHub (do this first)

1. Unzip MKLETTERS_Portal_Flat.zip. Open the folder and check the 14 files are directly inside.
2. Sign in at github.com (free account).
3. Tap **+**, then **New repository**. Use any name (for example `rvnp-attachment-portal`), choose **Private**, then **Create repository**.
4. Tap **uploading an existing file**, then **choose your files**. Select all 14 files (not the folder, not the zip). On a phone, turn on **Desktop site** in your browser first. Upload in batches if needed.
5. Check that all 14 files are listed, then tap **Commit changes**.

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

## Departments and courses

- Students first choose their **department**, then their **course** in it. The 9 departments and their courses come from the 2026-2027 brochure (about 120 courses).
- A course with no units yet shows "(coming soon)" and its letter cannot be downloaded until units are added. Your existing Electrical and Telecommunication courses keep their units.
- Admin page, **Attachment letters** tab: choose a department (or type part of a course name) to list its courses. Edit the title, department, percentage and units, then **Save courses**.
- To add a course: choose the department, press **+ Add a course to this department**, fill it in and Save.
- Nothing is listed until you choose a department or type at least 2 letters, so the page stays short.

## Units from ILO representatives

1. On the admin page, copy the **ILO representatives link** (`your-site/ilo.html`) and send it to each department's ILO representative.
2. They choose their department and course, enter the percentage covered and the units (one per line), and send.
3. You see them in the **ILO units** tab (the counter shows how many are waiting). **Approve** puts the units on that course's letter at once. **Reject** deletes the submission.
4. If their course is not listed they can type its name. Approving adds it to their department.
- Nothing changes on student letters until you approve.

## NITA form

Admin page, **Attachment letters** tab, **NITA form** card: upload the form (PDF, Word or image, up to 4 MB). Students then see a **NITA form** download button at the top of the student page. Remove it any time.

## Searching on the admin page

The Insurance covers student list and the course list stay hidden until you search (2 or more letters) or choose a department. The full student list is still available as **Download list (CSV)**.

## Handling cover requests

1. Admin page, **Cover requests** tab (the counter shows how many are waiting).
2. Each request has two buttons under the student's name:
   - **Approve**: opens a small box. Leave "This student is on a different policy" unticked to use the default policy, or tick it and enter that student's own policy number, date of issue, start date and expiry date. Press Approve. The student moves to the students list and can download their cover straight away.
   - **Remove**: deletes the request.
3. **Approve all (default policy)** approves every waiting request at once.
4. You can still upload a finished Excel/CSV list under **Insurance covers**. Requests for students on that list clear automatically.

## Students on a different policy

Every cover uses the **default policy** (Insurance covers tab, Policy details) unless you give the student another one. There are three levels, from most to least common:

1. **Named policies (best for groups).** In the **Other policies** card, press **+ Add a policy** and fill in a name (e.g. "Policy 2 - January intake"), policy number, insurer, start, expiry and issue date. Create each extra policy once, then:
   - give it to a **whole class** (choose the class and the policy, then Apply), or
   - give it to **one student** (search them, press **Policy** under their name, choose it), or
   - choose it when you **Approve** a cover request, or use the dropdown next to **Approve all**, or
   - put its name in a **Policy** column in your Excel/CSV upload.
   If you later edit a policy (for example a corrected date), every student on it updates automatically. Removing a policy sends its students back to the default.
2. **Custom dates for one student.** In that student's **Policy** box choose "Custom dates for this student only..." and enter the details. Use this only for one-offs.
3. **Default policy.** Everyone else.

The student's cover (and the policy number and insurer in their attachment letter) shows their own policy. The layout never changes. Giving a class or student a named policy replaces any one-off custom dates they had. Uploading again without a Policy column keeps what each student already has.

## Insurance policy for a whole class (from the ILO representative)

1. On the ILO page (`your-site/ilo.html`), the second card, **Insurance cover for a class**, lets the representative choose the class, then choose the policy it uses: the default, one of your policies, or "A policy not listed here" (they type the policy number, insurer and dates).
2. You see it in the **ILO units** tab (press **Refresh** to load new ones). **Approve and apply to the whole class** puts every student of that class on that policy at once. A new policy is added to your list automatically (you can rename it under **Other policies**).
3. The class remembers its policy: students added later (upload or approved request) in that class get it automatically. You can also set it yourself with **Give a policy to a whole class**. The **Class policies** line shows what each class uses.
4. When you approve a cover request, the box is already set to the class's policy; change it if that student is an exception.

**Letter and cover always match.** The attachment letter and the insurance cover read the policy number (and insurer and dates) from the same place for each student, so the numbers are always the same. If you change a student's or class's policy later, covers and letters downloaded after that show the new number.

## Student database (details filled in by students)

1. Share the **student details link** (`your-site/register.html`). You can copy it from the admin page (**Student database** tab) or from the ILO page, so ILO representatives can send it to their classes too.
2. Students enter their full name, admission number, class and contact number. If they submit again with the same name and admission number, their details are updated, not duplicated.
3. In the admin page, **Student database** tab, you see the **total number of students**, the number per class, and how many already have an insurance cover. Tap a class to list its students, or search by name, admission number, class or phone (the list stays hidden until you do).
4. **Download Excel (by class)** gives one file with a Summary sheet (students per class and the total), an "All students" sheet sorted by class, and a separate sheet for each class. **Download CSV** gives the same list as one sorted file.
5. Remove a student with the Remove button next to their name.

## Placements and trainers

**Students.** On the student page, the **Placement** tab. Once a student has secured a place they enter: full name, admission number, department, course, phone number 1, phone number 2 (optional), name of the organization, where it is (for example "near Nakuru Level 5 Hospital"), their supervisor at the organization, and the town. Submitting again with the same name and admission number updates the record. If they change the organization or town, their trainer is cleared so the HOD assigns again.

**Sending the HOD link.**
1. Admin page, **Placements** tab. Copy the **ILO HOD / Deputy HOD link** (it looks like `your-site/hod.html#k=...`) or press **Share on WhatsApp**.
2. Anyone with the link can use the HOD page, so send it only to the HOD and Deputy HOD. If it gets to the wrong person, press **Make a new link**. The old link stops working at once.

**The HOD / Deputy HOD page.**
1. Shows how many students are placed, how many have a trainer, how many are waiting, and how many trainers there are.
2. **Trainers**: type a trainer's name and phone number and press **Add trainer**. Next to each trainer is the number of students assigned to them. **View students** lists them, **Edit** fixes a name or number, **Remove** deletes the trainer and returns their students to "Waiting".
3. **Students**: search by name, admission number, organization or town, or filter by department or trainer. Tick students (or **Tick all shown**), choose a trainer and press **Assign**. **Remove trainer** takes the ticked students off their trainer.
4. **Download Excel (by trainer)** gives a Summary sheet (students per trainer), an All placements sheet, a Waiting sheet, and one sheet per trainer. **Download CSV** gives one flat list.

**Students see their trainer.** On the student page, **Placement** tab, a student enters their name and admission number and presses **Check my trainer**. They see their trainer's name and phone number, and their saved placement details are filled back into the form. They only see their own record.

The admin page **Placements** tab also shows the totals, trainers with their student counts, a search, a Remove button for a wrong entry, and a CSV download.

## Student marks (private) and notices

**Who can do what**

| Person | Can do |
|---|---|
| Student | See **only their own** marks (My marks tab) and read notices for students |
| ILO representative | Search a student and enter, correct or delete marks; read notices; post their own notices (shown with their name) and delete their own. Needs the ILO access code |
| ILO HOD / Deputy HOD | Post and delete their own notices (HOD page, **Official notices** card) |
| Admin | Everything above, plus hide/show marks, reset a student PIN, make a new ILO code, delete any notice |

**How a student keeps their marks private**

1. The student's page has **My marks** and **Notices** tabs.
2. First time: the student presses **First time? Create my PIN**, enters name, admission number, the **phone number they gave on the student details form** (`register.html`) and chooses a PIN of 5 to 8 digits. The phone number proves it is them. The PIN can only be created once, so nobody else can take it over later.
3. After that they sign in with name, admission number and PIN. Five wrong PINs lock that student for 15 minutes.
4. The server returns marks only for the student named inside their sign-in token. There is no way to ask for another student's marks, and no search on the student side. The token lasts 2 hours and is kept only in the open page, so marks disappear when the student leaves the tab or presses **Hide my marks**.
5. PINs are stored scrambled (salted scrypt), never as the PIN itself.
6. Students must have filled the student details form. If a student forgets the PIN, admin finds them under **Student marks, Find a student** and presses **Reset PIN**.

**ILO representatives entering marks**

1. Admin page, **Student marks** tab, **ILO representatives access**: copy the link (it contains the access code) or the code, and send it to the representatives on WhatsApp.
2. The representative opens the link, enters their name once and the page remembers them on that phone. Opening `your-site/ilo.html` and tapping **Student marks** and typing the code works too.
3. **Student marks** tab: type 3 or more letters of the name or the admission number, tap the student, then enter **Unit**, **Assessment** (CAT 1, CAT 2, End of term exam, and so on), **Mark** and **Out of**. Saving the same unit and assessment again replaces the earlier mark, so nothing is entered twice. Unit, assessment and out-of stay filled in so the next student is quick.
4. Every mark records who entered it. Representatives can edit or delete marks from the list under the form.
5. **Make a new code** (admin) stops the old code and link at once. Anyone who had it must use the new one.
6. Untick **Students can view their marks** on the admin page to hide all marks from students while entry is going on. Representatives can keep entering.

**Official notices**

1. Admin page **Notices** tab, the HOD page, or the ILO page **Notices** tab (representatives): **Official notices** card: write a title and message, choose **Everyone**, **Students only** or **ILO representatives only**, tick **Important** if needed, and post.
2. Students see notices on their **Notices** tab without signing in. ILO representatives see theirs on the **Notices** tab of the ILO page. A red badge shows the number of unread notices.
3. The HOD can delete notices posted from the HOD page and by representatives. A representative can delete only their own. Admin can delete any. A representative's notice always shows their own name as sender.

**Screens.** The pages fit phones, tablets and laptops and re-fit when you rotate the screen. If a phone does not rotate, turn on auto-rotate in the phone's quick settings.
4. Do not put marks or personal details in a notice, because students read notices without signing in. Notices are not a private chat: they go to everyone in the chosen group.

## Troubleshooting

- **Old version still showing:** open the site in a private tab or hard refresh.
- **HOD page says the link is not valid:** the link was replaced with **Make a new link**. Send the current one from the admin Placements tab.
- **A student cannot create a PIN:** check they filled the student details form, and that the phone number they type matches the one on that form (last 9 digits). Use the same name and admission number.
- **ILO code not accepted:** a new code may have been made. Copy the current one from the admin Student marks tab.
- **Admin sign-in fails:** check `ADMIN_PASSWORD`, then redeploy.
- **Search or requests do nothing:** api.mjs was not deployed. Check it is in the repository at the top level.
- **No "Link repository" button:** open **Continuous deployment** and check what it says, or create a new site from GitHub (see above).
- **Letter PDF differs from preview:** use an up-to-date browser and report which phone and browser you used.
