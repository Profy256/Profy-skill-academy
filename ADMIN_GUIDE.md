# Dera Skul Admin Guide

## Overview

This guide covers how to use the admin panel to manage your courses, lessons, and content.

---

## Quick Actions Dashboard

When you log in, you'll see the **Quick Actions** dashboard with 4 main buttons:

| Button | What It Does |
|--------|--------------|
| **Setup Course Structure** | Create a full category hierarchy in one go |
| **Add from YouTube** | Paste a YouTube URL, auto-creates a lesson |
| **Import from Website** | Paste any URL, AI generates a lesson |
| **Upload Book/PDF** | Upload a file, AI generates multiple lessons |

---

## 1. Setting Up Course Structure

### Step-by-Step Wizard

1. Click **"Setup Course Structure"** on the dashboard

2. **Step 1 - Category:**
   - Enter category name (e.g., "Programming")
   - Add description (optional)
   - Add icon (optional, e.g., 💻)
   - Click **"Next: Add Subcategories"**

3. **Step 2 - Subcategories:**
   - Enter subcategory names (e.g., "Languages", "Web Dev")
   - Click **"+ Add another subcategory"** to add more
   - Click **"Next: Add Courses"**

4. **Step 3 - Courses:**
   - Under each subcategory, add courses (e.g., "Python", "Go", "JavaScript")
   - This step is optional - you can add courses later
   - Click **"Create Everything"**

5. **Step 4 - Done!**
   - Your entire structure is created
   - Click **"Done - View Taxonomy"** to see it

### Example Structure Created:
```
Programming (Category)
├── Languages (Subcategory)
│   ├── Python (Course)
│   ├── Go (Course)
│   └── JavaScript (Course)
├── Web Dev (Subcategory)
│   ├── React (Course)
│   └── Node.js (Course)
└── Data Science (Subcategory)
    ├── Pandas (Course)
    └── NumPy (Course)
```

---

## 2. Adding Lessons from YouTube

1. Click **"Add from YouTube"** on the dashboard

2. Select a course from the dropdown

3. Paste the YouTube URL:
   ```
   https://www.youtube.com/watch?v=XXXXXXXXXXX
   ```

4. Click **"Import YouTube Video"**

5. The system will:
   - Extract the video title and channel name
   - Create a draft lesson
   - Attach the video to the lesson

6. Click **"View in Lesson Editor"** to edit the lesson content

---

## 3. Importing from Websites

1. Click **"Import from Website"** on the dashboard

2. Select a course from the dropdown

3. Paste any URL:
   ```
   https://developer.mozilla.org/en-US/docs/Web/HTML
   https://www.freecodecamp.org/news/python-for-beginners/
   https://docs.python.org/3/tutorial/
   ```

4. Click **"Generate Lesson from URL"**

5. The system will:
   - Fetch the content from the URL
   - Use AI to generate a complete lesson
   - Create objectives, examples, exercises, and quizzes

6. Click **"View in Lesson Editor"** to review and edit

---

## 4. Uploading Books/PDFs

1. Click **"Upload Book/PDF"** on the dashboard

2. Select a course from the dropdown

3. **Drag & drop** a file or click to browse:
   - Supported formats: .txt, .md, .pdf, .doc, .docx

4. Choose how many lessons to generate (1-10)

5. Click **"Generate Lessons from File"**

6. The system will:
   - Read the file content
   - Split it into sections
   - Use AI to generate multiple lessons

7. Click **"View in Lesson Editor"** to review all lessons

---

## 5. Using the Taxonomy Editor

For manual control, use the **Taxonomy Manager** from the sidebar.

### Creating Nodes

1. Click **"+ New"** at the top of the tree panel

2. Enter the node name

3. Press **Enter** or click **"Add"**

### Adding Children

1. Click on a category or subcategory

2. Click the **"+"** button that appears on hover

3. Or click **"+ Add Subcategory"** / **"+ Add Course"** button at the bottom

### Editing Nodes

1. Click any node in the tree

2. Edit the name or description in the right panel

3. Click **"SAVE CHANGES"**

### Deleting Nodes

1. Hover over a node

2. Click the **"×"** button

3. Confirm deletion

---

## 6. Using the Lesson Editor

### Creating a Lesson

1. Go to **Lesson Editor** from the sidebar

2. Click **"+ New"** button

3. Select a course from the dropdown

4. Enter the lesson title

5. Click **"Create Lesson"**

### Editing Lesson Content

1. Select a lesson from the list

2. Fill in the fields:
   - **Title** - Lesson name
   - **Description** - Short summary
   - **Explanation** - Full lesson content
   - **Learning Objectives** - What students will learn
   - **Examples** - Code examples or demonstrations
   - **Exercises** - Practice problems
   - **Quiz Questions** - Multiple choice questions

3. Click **"SAVE LESSON"**

### Adding Videos

1. In the right panel of the lesson editor

2. Paste a YouTube URL

3. Enter the video title

4. Click **"+ Add Video"**

5. Or click **"Auto-find video"** to search YouTube automatically

---

## 7. AI Assistant

Use the **AI Assistant** to create content through conversation.

### Example Commands

```
Create a lesson about HTML forms
Add a new category for Data Science
Generate 5 lessons for JavaScript Essentials
List all courses in the taxonomy
Show me all draft lessons
```

### AI Can:
- Create categories, subcategories, and courses
- Generate complete lesson content
- Search and list existing content
- Answer questions about your taxonomy

---

## 8. Review Queue

Check the **Review Queue** to manage auto-sourced videos.

### Review Queue Shows:
- Videos that need approval
- Flagged or unavailable videos
- Auto-sourced videos pending review

### Actions:
- **Approve** - Mark video as approved
- **Flag** - Mark video for review
- **Remove** - Delete the video
- **Set Primary** - Make it the main video for the lesson

## 9. Certificates (sidebar → Certificates)

One screen, four tabs. Everything here is editable **without a deploy** — the design, pricing and
gates live in the `certificate_settings` row, and the per-course test lives on the course itself.

### Design & Pricing
| Field | What it controls | Default |
|---|---|---|
| Retake price (USD / UGX) | Cost of a retake credit (Stripe / MarzPay) | $2.00 / 7,500 UGX |
| Free attempt threshold | % of the course's lessons a learner must complete **before** attempt #1 is free | 50% |
| Pass mark | Score required to earn a certificate | 70% |
| Test title + instructions | Shown on the Certificate tab (`{passPercent}` is replaced) | — |
| Heading / intro / achieved / labels / signature / footer | The wording printed on the credential | — |
| Colors, paper size, QR toggle | Credential look; **QR encodes the `/verify/{code}` URL** | — |
| Enable certificates | Master switch — off = the test is hidden for everyone | on |

The **live preview** on the right updates as you type. Save writes the settings (audited).

### Final Tests
Pick a course, add multiple-choice questions (2+ options), mark the correct option, set a pass %.
The answer key is stored server-side and is **never** sent to the browser — grading happens in the API.
A course with no questions simply shows "no test published" to learners.

### Credentials
Create named credentials ("Certificate of Completion", "Distinction", …): badge color, description,
criteria (pass the final test / complete the course), pass %, minimum progress, auto-issue, and
per-credential text overrides. Tie one to a course, or **manually award** a credential by learner
email (catch-up grants for offline workshops).

### Issued
Every credential handed out — search, then **Revoke** (verification at `/verify/{code}` immediately
reports `revoked`) or **Reinstate**.

**Notes:** the PDF/PNG are rendered on demand from `/verify/{code}/pdf|/png`. Email delivery runs on a
background thread and is skipped (logged) until `RESEND_API_KEY` is set — certificates still issue.

---

## 10. Blog Manager (sidebar → Blog Manager)

Markdown posts with SEO fields; the website renders them at **`/blog`** (plus the sitemap, RSS feed
and `llms.txt`).

- **New post / Edit** — title, slug (auto-derived from the title, editable), excerpt, cover image URL,
  comma-separated tags, **SEO title**, **SEO description**, and the Markdown body with a live preview.
- **Publish / Unpublish** — only `published` posts are visible publicly; unpublishing returns a post to
  `draft`. Archived posts stay in the list but never surface.
- **Delete** — removes the post (permanent).

Every write is audit-logged. Sanitising happens on render, so HTML pasted into Markdown cannot inject
scripts into the site.

---

## Tips

1. **Start with Quick Actions** - Use the dashboard for fast content creation

2. **Use the Wizard** - The setup wizard saves time for new categories

3. **Let AI Help** - Paste URLs or upload files instead of writing from scratch

4. **Review Generated Content** - Always review AI-generated lessons before publishing

5. **Use the Taxonomy Editor** - For precise control over the hierarchy

6. **Check Review Queue** - Regularly review auto-sourced videos

7. **Certificates** - Change pricing, pass mark or wording in Certificates → Design & Pricing (no deploy needed)

8. **Blog** - Write posts in Blog Manager; they go live at /blog the moment you hit Publish

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Enter** | Confirm inline forms |
| **Escape** | Cancel inline forms |
| **Tab** | Move between fields |

---

## Need Help?

- Use the **AI Assistant** for quick questions
- Check this guide for detailed instructions
- Contact support if issues persist
