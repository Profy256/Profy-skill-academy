-- ═══════════════════════════════════════════════════════════════════════════
--  Dera Skul — demo content seed  (todo.md M0 "Seed script" + M2 "demo courses")
-- ═══════════════════════════════════════════════════════════════════════════
--  Idempotent, additive, and non-destructive: every statement inserts only when
--  the row (keyed by slug) is missing, so it can be re-run any number of times
--  and will never delete or rewrite content an admin authored through the UI.
--
--  Run it with:   ./scripts/seed.sh
--  (or directly:  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/seed_content.sql)
--
--  What it creates:
--    1. The three Phase-1 categories of PRD §6 — reusing the rows Flyway V10/V11
--       already seeded (`programming`, `business`, `languages`) when present, so
--       a database that was never touched still ends up with exactly 3.
--    2. Phase-2 categories with phase = 2 (hidden from consumers server-side).
--    3. Subcategories from PRD §6 under whichever category already exists.
--    4. Four demo courses + twelve published lessons carrying full AI-Teacher
--       scope fields (description, explanation, objectives, examples,
--       exercises, quizzes).
--    5. One curated, approved, primary YouTube video per lesson — every video ID
--       below was verified against the YouTube oEmbed API, and the title/channel
--       are the values that API returned (curated source, not auto).
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. Phase-1 categories (PRD §6: Technology · Business & Finance · Languages)
-- Slug-unique table: a category is "already there" if any of its known slugs
-- exists, so we never end up with a duplicate top-level node.
INSERT INTO taxonomy_nodes
    (parent_id, node_type, name, slug, description, icon, phase, is_active, sort_order, depth)
SELECT NULL, 'category', v.name, v.slug, v.description, v.icon, 1, true, v.sort_order, 0
FROM (VALUES
    ('technology', 'Technology', 'Software, the web, and the systems behind them', '💻', 0,
     ARRAY['tech', 'programming']),
    ('business-finance', 'Business & Finance', 'Entrepreneurship, accounting, marketing and money', '📈', 1,
     ARRAY['business', 'business-finance']),
    ('languages', 'Languages', 'Learn a new language from beginner to advanced', '🌍', 2,
     ARRAY['languages'])
) AS v(slug, name, description, icon, sort_order, aliases)
WHERE NOT EXISTS (SELECT 1 FROM taxonomy_nodes n WHERE n.slug = ANY(v.aliases));

-- ─── 2. Phase-2 categories — seeded now, hidden at launch (PRD §6)
INSERT INTO taxonomy_nodes
    (parent_id, node_type, name, slug, description, phase, is_active, sort_order, depth)
SELECT NULL, 'category', v.name, v.slug, v.description, 2, true, v.sort_order, 0
FROM (VALUES
    ('food-production',        'Food Production',            'Processing and preserving food',              10),
    ('farming-agriculture',    'Farming & Agriculture',      'Crop, livestock and modern farming practice',  11),
    ('construction',           'Construction',               'Building trades and site skills',             12),
    ('automotive',             'Automotive',                 'Vehicle maintenance and repair',              13),
    ('beauty-fashion',         'Beauty & Fashion',           'Styling, cosmetology and fashion design',     14),
    ('manufacturing',          'Manufacturing',              'Production lines, machining and assembly',    15)
) AS v(slug, name, description, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM taxonomy_nodes n WHERE n.slug = v.slug);

-- ─── 3. Subcategories (PRD §6 children, attached to whichever parent exists)
--       `programming` ≈ Technology, `business` ≈ Business & Finance.
INSERT INTO taxonomy_nodes
    (parent_id, node_type, name, slug, description, phase, is_active, sort_order, depth)
SELECT p.id, 'subcategory', v.name, v.slug, v.description, 1, true, v.sort_order, 1
FROM (VALUES
    -- Technology
    ('web-development',   'Web Development',   'HTML, CSS, JavaScript and the modern web',            0, ARRAY['technology', 'programming', 'tech']),
    ('backend-development','Backend Development','APIs, databases and server-side programming',       1, ARRAY['technology', 'programming', 'tech']),
    ('linux',             'Linux',             'The command line, servers and open-source tooling',   2, ARRAY['technology', 'programming', 'tech']),
    ('cloud',             'Cloud',             'Deploying and scaling applications in the cloud',     3, ARRAY['technology', 'programming', 'tech']),
    -- Business & Finance
    ('entrepreneurship',  'Entrepreneurship',  'Starting, validating and growing a business',         0, ARRAY['business', 'business-finance']),
    ('accounting',        'Accounting',        'Bookkeeping, statements and financial reporting',     1, ARRAY['business', 'business-finance']),
    ('personal-finance',  'Personal Finance',  'Budgeting, saving, debt and investing basics',        2, ARRAY['business', 'business-finance']),
    ('marketing',         'Marketing',         'Positioning, channels and growing an audience',       3, ARRAY['business', 'business-finance']),
    -- Languages
    ('english',           'English',           'Master English from beginner to advanced',            0, ARRAY['languages']),
    ('french',            'French',            'Learn French from beginner to advanced',              1, ARRAY['languages']),
    ('german',            'German',            'Learn German from beginner to advanced',              2, ARRAY['languages']),
    ('spanish',           'Spanish',           'Learn Spanish from beginner to advanced',             3, ARRAY['languages']),
    ('swahili',           'Swahili',           'Learn Swahili from beginner to advanced',             4, ARRAY['languages'])
) AS v(slug, name, description, sort_order, parent_aliases)
CROSS JOIN LATERAL (
    -- First matching alias wins, so 'technology' beats 'programming' if both exist.
    SELECT n.id
    FROM taxonomy_nodes n
    WHERE n.node_type = 'category' AND n.slug = ANY (v.parent_aliases)
    ORDER BY array_position(v.parent_aliases, n.slug)
    LIMIT 1
) p
WHERE NOT EXISTS (SELECT 1 FROM taxonomy_nodes n WHERE n.slug = v.slug);

-- ─── 4. Demo courses (depth 2 = the API's maximum taxonomy depth)
INSERT INTO taxonomy_nodes
    (parent_id, node_type, name, slug, description, phase, is_active, sort_order, depth)
SELECT p.id, 'course', v.name, v.slug, v.description, 1, true, v.sort_order, 2
FROM (VALUES
    ('web-development-basics',       'Web Development Basics',       'Build your first web page with HTML, CSS and JavaScript',                              0, 'web-development'),
    ('rest-api-design',              'REST API Design',              'Design and build clean, well-structured REST APIs',                                     0, 'backend-development'),
    ('personal-finance-essentials',  'Personal Finance Essentials',  'Take control of your money: budgeting, saving and investing fundamentals',              0, 'personal-finance'),
    ('english-for-beginners',        'English for Beginners',        'Start speaking English with confidence from day one',                                   0, 'english')
) AS v(slug, name, description, sort_order, parent_slug)
JOIN taxonomy_nodes p
  ON p.slug = v.parent_slug AND p.node_type IN ('category', 'subcategory')
WHERE NOT EXISTS (SELECT 1 FROM taxonomy_nodes n WHERE n.slug = v.slug);

-- ─── 5. Lessons — full AI-Teacher scope on every row ─────────────────────────
-- Quizzes use the `correctIndex` shape the admin editor writes; they are graded
-- client-side as practice (the course final test is graded server-side).

-- 5a. Web Development Basics ─────────────────────────────────────────────────
INSERT INTO lessons
    (node_id, title, slug, description, explanation, objectives, examples, exercises, quizzes,
     level, status, sort_order, created_by)
SELECT c.id, v.title, v.slug, v.description, v.explanation,
       v.objectives::jsonb, v.examples::jsonb, v.exercises::jsonb, v.quizzes::jsonb,
       v.level, 'published', v.sort_order,
       (SELECT a.id FROM admin_users a ORDER BY a.created_at LIMIT 1)
FROM taxonomy_nodes c
JOIN (VALUES
    ('html-first-page', 'HTML: your first web page',
     'Learn the structure of an HTML document and build a page from scratch.',
     'HTML is the skeleton of every website. It describes content — headings, paragraphs, links, images and lists — rather than how it looks. Browsers read your HTML and build the page from it, so getting the structure right is the first real skill of web development.',
     '["Write a valid HTML5 document with doctype, head and body", "Use headings, paragraphs, lists and links to structure content", "Embed images and give every element meaningful alt text", "Inspect a page''s markup in the browser dev tools"]',
     '["<h1>Welcome to my site</h1> — the main heading of the page", "<a href=\"/about.html\">About us</a> — a link to another page", "<img src=\"team.jpg\" alt=\"The four founders\"> — an image with accessible alt text"]',
     '["Recreate the structure of your favourite news homepage in plain HTML", "Add an ordered list of your top 5 programming tips", "Find and fix three invalid tags in a provided snippet"]',
     '[{"question": "Which element marks the main heading of an HTML page?", "options": ["<h1>", "<head>", "<header>", "<title>"], "correctIndex": 0}, {"question": "Why does an image need alt text?", "options": ["It makes the image load faster", "It describes the image for screen readers and when it fails to load", "It changes the image format", "It is only required by the admin panel"], "correctIndex": 1}]',
     'beginner', 0),
    ('css-styling-page', 'CSS: styling the web page',
     'Turn a bare HTML document into a responsive, good-looking page with CSS.',
     'CSS is the presentation layer of the web: selectors pick elements, properties change how they look. You will work with the box model (margin, border, padding, content), colours, typography and Flexbox, and finish with a simple responsive layout that works on phones and desktops alike.',
     '["Select elements with class, id and descendant selectors", "Explain and apply the CSS box model", "Lay out a row of cards with Flexbox", "Write a media query so the layout adapts to small screens"]',
     '["body { font-family: system-ui; } — set the page font once", ".card { display: flex; gap: 1rem; } — lay cards out in a row", "@media (max-width: 600px) { .card { flex-direction: column; } } — stack on mobile"]',
     '["Style every heading and paragraph of your HTML page", "Build a three-card row with Flexbox and a gap of 1rem", "Add a media query so the cards stack below 600px"]',
     '[{"question": "What does the box model consist of?", "options": ["Content, padding, border and margin", "Selectors, properties and values", "HTML, CSS and JavaScript", "Width and height only"], "correctIndex": 0}, {"question": "Which rule stacks Flexbox items vertically?", "options": ["flex-direction: row", "flex-direction: column", "display: block", "float: left"], "correctIndex": 1}]',
     'beginner', 1),
    ('js-interactive-page', 'JavaScript: making pages interactive',
     'Add behaviour to a page: variables, functions, events and the DOM.',
     'JavaScript is the programming language of the browser. Once you can select elements and listen for events, a static page becomes an application: you can validate a form, toggle a menu, or render content from data. This lesson covers variables, functions, DOM selection and click handlers.',
     '["Declare variables with const and let and choose between them", "Select and update elements with DOM APIs", "Attach a click handler and change the page in response", "Debug with the browser console"]',
     '["const name = \"Ada\"; — a value that never gets reassigned", "document.querySelector(\"#menu\").classList.toggle(\"open\")", "button.addEventListener(\"click\", () => total++)"]',
     '["Add a button that increments and displays a counter", "Hide or show a menu on click", "Log the value of a form field as the user types"]',
     '[{"question": "Which keyword declares a value that cannot be reassigned?", "options": ["var", "let", "const", "def"], "correctIndex": 2}, {"question": "What does addEventListener do?", "options": ["Adds a new element", "Runs a function when an event happens", "Reloads the page", "Styles an element"], "correctIndex": 1}]',
     'beginner', 2)
) AS v(slug, title, description, explanation, objectives, examples, exercises, quizzes, level, sort_order)
     ON c.slug = 'web-development-basics'
WHERE NOT EXISTS (
    SELECT 1 FROM lessons l WHERE l.node_id = c.id AND l.slug = v.slug
)
  AND EXISTS (SELECT 1 FROM admin_users);

-- 5b. REST API Design ────────────────────────────────────────────────────────
INSERT INTO lessons
    (node_id, title, slug, description, explanation, objectives, examples, exercises, quizzes,
     level, status, sort_order, created_by)
SELECT c.id, v.title, v.slug, v.description, v.explanation,
       v.objectives::jsonb, v.examples::jsonb, v.exercises::jsonb, v.quizzes::jsonb,
       v.level, 'published', v.sort_order,
       (SELECT a.id FROM admin_users a ORDER BY a.created_at LIMIT 1)
FROM taxonomy_nodes c
JOIN (VALUES
    ('what-is-a-rest-api', 'What is a REST API?',
     'Understand what an API is, what REST means, and why apps depend on them.',
     'An API is a contract that lets two programs talk to each other. REST is the most common style for web APIs: it exposes resources through URLs, uses standard HTTP verbs (GET, POST, PUT, DELETE), and returns JSON. Every app that loads a feed, a profile or a checkout is calling one.',
     '["Define API, resource, endpoint and payload in your own words", "Map HTTP verbs to CRUD operations", "Explain what makes an interface RESTful", "Read a simple API response and identify its fields"]',
     '["GET /api/v1/courses → returns a list of courses", "POST /api/v1/courses → creates one from a JSON body", "DELETE /api/v1/courses/42 → removes course 42"]',
     '["List the endpoints an online shop needs for products and orders", "Rewrite a chatty RPC-style design as REST resources", "Predict the status code for creating a duplicate slug"]',
     '[{"question": "Which HTTP verb usually deletes a resource?", "options": ["GET", "POST", "DELETE", "PATCH"], "correctIndex": 2}, {"question": "What format do REST APIs most often return?", "options": ["HTML only", "JSON", "CSV", "Plain text only"], "correctIndex": 1}]',
     'beginner', 0),
    ('designing-clean-endpoints', 'Designing clean REST endpoints',
     'Model resources, verbs and status codes so an API is predictable to use.',
     'Good API design is mostly good resource modelling. Name collections in the plural, nest only one level deep, keep verbs in the HTTP method rather than the URL, and always return the right status code with a consistent error envelope. Consistency is what makes an API pleasant to work with.',
     '["Model a domain as plural, predictable resource URLs", "Choose between nesting and query parameters", "Return accurate HTTP status codes", "Describe errors with a stable { error: { code, message } } shape"]',
     '["GET /orders/9/items — items of one order, not /getOrderItems", "404 Not Found vs 400 Bad Request — client mistake or missing resource", "409 Conflict — the slug you posted already exists"]',
     '["Design the endpoints for a blog: posts, comments, tags", "List the status codes a registration flow should return", "Spot three anti-patterns in a /getUserById?url= style API"]',
     '[{"question": "Where should \"create\" live in a REST URL?", "options": ["/createOrder", "POST /orders", "GET /orders/create", "/orders?create=true"], "correctIndex": 1}, {"question": "Which status code means the resource does not exist?", "options": ["200", "400", "404", "500"], "correctIndex": 2}]',
     'intermediate', 1),
    ('building-api-with-node', 'Building an API with Node.js',
     'Put theory into practice: a small JSON API with routes, handlers and status codes.',
     'Node.js pairs a minimal runtime with a huge package ecosystem, which is why it is a popular choice for APIs. You will create a server, register routes, read request bodies, keep data in memory, and reply with correct status codes — the same shapes you would later persist in a database.',
     '["Start an HTTP server and register routes", "Parse JSON request bodies safely", "Respond with the right status code and payload", "Handle missing records with 404"]',
     '["app.get(\"/courses\", handler) — list", "res.status(404).json({ error: \"not found\" })", "app.use(express.json()) — parse JSON bodies"]',
     '["Add POST /courses that appends to an in-memory array", "Return 404 for an unknown course id", "Validate the request body and return 400 when the name is missing"]',
     '[{"question": "Which line parses incoming JSON bodies in Express?", "options": ["app.use(express.json())", "app.listen(3000)", "res.send()", "req.body.parse()"], "correctIndex": 0}, {"question": "What should you return when a course id does not exist?", "options": ["200", "404", "409", "301"], "correctIndex": 1}]',
     'intermediate', 2)
) AS v(slug, title, description, explanation, objectives, examples, exercises, quizzes, level, sort_order)
     ON c.slug = 'rest-api-design'
WHERE NOT EXISTS (
    SELECT 1 FROM lessons l WHERE l.node_id = c.id AND l.slug = v.slug
)
  AND EXISTS (SELECT 1 FROM admin_users);

-- 5c. Personal Finance Essentials ────────────────────────────────────────────
INSERT INTO lessons
    (node_id, title, slug, description, explanation, objectives, examples, exercises, quizzes,
     level, status, sort_order, created_by)
SELECT c.id, v.title, v.slug, v.description, v.explanation,
       v.objectives::jsonb, v.examples::jsonb, v.exercises::jsonb, v.quizzes::jsonb,
       v.level, 'published', v.sort_order,
       (SELECT a.id FROM admin_users a ORDER BY a.created_at LIMIT 1)
FROM taxonomy_nodes c
JOIN (VALUES
    ('money-basics', 'Managing your money: the basics',
     'Where your money goes, how to track it, and the habits that keep it moving.',
     'Personal finance starts with awareness. When you know what comes in, what goes out, and what you owe, decisions become much easier. This lesson covers income, expenses, the difference between needs and wants, and a simple tracking habit you can keep up for years.',
     '["List your income and fixed versus variable expenses", "Separate needs from wants in a monthly budget", "Build a one-page money tracker you actually maintain", "Identify three leaks in a typical monthly spend"]',
     '["Salary 3,000 · rent 900 · transport 150 · groceries 250", "A subscription you forgot about is a want, not a need", "Reviewing your tracker for 10 minutes every Sunday"]',
     '["Write down every expense for the next seven days", "Categorise a month of spending as need or want", "Find one recurring charge you can cancel this week"]',
     '[{"question": "Which of these is a fixed expense?", "options": ["Rent", "A restaurant meal", "Impulse online shopping", "A concert ticket"], "correctIndex": 0}, {"question": "Why track your spending weekly?", "options": ["It improves your credit score", "You catch problems while there is still time to act", "It is required by law", "Banks require it"], "correctIndex": 1}]',
     'beginner', 0),
    ('financial-literacy', 'Financial literacy in an hour',
     'The core ideas — credit, interest, inflation, insurance and compounding — explained plainly.',
     'Financial literacy is the vocabulary of money. Interest can work for you or against you, inflation quietly reduces what cash is worth, and insurance trades a small certain cost for protection against a large uncertain one. Understand these five ideas and most financial products stop being confusing.',
     '["Explain simple versus compound interest", "Describe how inflation changes purchasing power", "Recognise when credit helps and when it hurts", "Match common risks to the right kind of insurance"]',
     '["1,000 at 10% compound interest earns interest on interest", "1,000 today buys less in ten years if prices rise 5% a year", "A low-interest loan for skills can raise income; a payday loan rarely does"]',
     '["Calculate what 200 saved monthly becomes after five years at 8%", "Compare the total cost of two loans with different rates", "List three risks worth insuring and two that are not"]',
     '[{"question": "What is compound interest?", "options": ["Interest on your interest", "A tax on savings", "Interest charged daily", "Bank fees"], "correctIndex": 0}, {"question": "Inflation mostly means...", "options": ["Wages always rise", "Money buys less over time", "Banks pay no interest", "Prices never change"], "correctIndex": 1}]',
     'beginner', 1),
    ('budgeting-50-30-20', 'Budgeting with the 50/30/20 rule',
     'A simple, durable budget split for needs, wants and the future.',
     'The 50/30/20 rule turns budgeting into one decision per paycheck: about half after-tax income for needs, a third for wants, and the rest for savings and debt. It is deliberately rough — rough that you follow beats perfect that you abandon — and it adapts as your income changes.',
     '["Split after-tax income into needs, wants and savings", "Adjust the ratios for a low or high income", "Automate the savings slice on payday", "Use the rule to prioritise debt repayment"]',
     '["Income 2,000 → 1,000 needs · 600 wants · 400 savings", "An emergency fund is the first home for the savings slice", "High-interest debt jumps ahead of investing"]',
     '["Apply 50/30/20 to your own monthly income", "Decide which of five expenses belong in the wants slice", "Set up an automatic transfer the day you are paid"]',
     '[{"question": "Where does the savings slice go first?", "options": ["An emergency fund", "New clothes", "A holiday", "Dining out"], "correctIndex": 0}, {"question": "The main advantage of 50/30/20 is that it is...", "options": ["Precise to the cent", "Simple enough to keep following", "Legally required", "Only for high earners"], "correctIndex": 1}]',
     'beginner', 2)
) AS v(slug, title, description, explanation, objectives, examples, exercises, quizzes, level, sort_order)
     ON c.slug = 'personal-finance-essentials'
WHERE NOT EXISTS (
    SELECT 1 FROM lessons l WHERE l.node_id = c.id AND l.slug = v.slug
)
  AND EXISTS (SELECT 1 FROM admin_users);

-- 5d. English for Beginners ──────────────────────────────────────────────────
INSERT INTO lessons
    (node_id, title, slug, description, explanation, objectives, examples, exercises, quizzes,
     level, status, sort_order, created_by)
SELECT c.id, v.title, v.slug, v.description, v.explanation,
       v.objectives::jsonb, v.examples::jsonb, v.exercises::jsonb, v.quizzes::jsonb,
       v.level, 'published', v.sort_order,
       (SELECT a.id FROM admin_users a ORDER BY a.created_at LIMIT 1)
FROM taxonomy_nodes c
JOIN (VALUES
    ('greetings-introductions', 'Greetings and introductions',
     'Meet people: greetings, names, and how to keep a first conversation going.',
     'Every conversation starts with a greeting. This lesson covers formal and informal ways to say hello, how to introduce yourself and ask a basic question back, and the small phrases that keep a first exchange flowing instead of stalling after one sentence.',
     '["Greet someone formally and informally", "Introduce yourself and ask for a name", "Ask and answer one or two follow-up questions", "Close a short conversation politely"]',
     '["Good morning, I''m Amara. And you?", "Nice to meet you — what do you do?", "I''m from Kampala. How about you?"]',
     '["Role-play meeting a colleague at a conference", "Write a five-line self-introduction", "Practise the exchange aloud until it feels natural"]',
     '[{"question": "Which greeting suits a formal business meeting?", "options": ["Hey, what''s up?", "Good morning, it''s a pleasure to meet you.", "Yo!", "Sup?"], "correctIndex": 1}, {"question": "How do you ask someone''s name politely?", "options": ["What are you called?", "You name what?", "Name me yours", "Who you?"], "correctIndex": 0}]',
     'beginner', 0),
    ('listening-greetings', 'Listening practice: greetings and introductions',
     'Train your ear on real-speed greetings before you speak them yourself.',
     'Understanding spoken English is harder than reading it because words arrive fast and often blur together. In this lesson you listen to short everyday exchanges, notice how greetings are really pronounced, and shadow the speakers — repeating immediately, with the same rhythm, until the phrases come out automatically.',
     '["Follow a short native-speed greeting exchange", "Identify formal versus informal register by ear", "Shadow a dialogue with matching rhythm", "Catch the question each speaker asks back"]',
     '["«Hi, I''m Sam.» «Nice to meet you, Sam.»", "«How''s it going?» «Pretty good, thanks!»", "«Pleased to meet you.» «Likewise.»"]',
     '["Listen once without pausing, then again with the transcript", "Shadow each line three times out loud", "Write down every question you hear in the clip"]',
     '[{"question": "\"How''s it going?\" is best answered with...", "options": ["My name is Lina", "Pretty good, thanks — you?", "I go to school", "It is going to the store"], "correctIndex": 1}, {"question": "Shadowing means...", "options": ["Reading silently", "Repeating immediately with the speaker''s rhythm", "Translating word by word", "Writing the dialogue"], "correctIndex": 1}]',
     'beginner', 1),
    ('numbers-and-counting', 'Numbers and counting',
     'Say, hear and use English numbers — from prices to phone numbers and dates.',
     'Numbers appear everywhere: prices, times, dates, phone numbers and measurements. English number patterns (twenty-one, thirty-two, a hundred and five) differ from many languages, so this lesson drills the patterns that cause the most confusion and puts them to use in real sentences.',
     '["Count from 1 to 100 clearly and confidently", "Form compound numbers like twenty-one and ninety-nine", "Read prices, times and phone numbers aloud", "Ask and answer \"how much\" and \"what time\" questions"]',
     '["It''s twenty-five shillings.", "The meeting is at half past three.", "My number is 0-seven-oh, double four…"]',
     '["Write today''s date and read it aloud", "Read five prices from a menu with correct stress", "Dictate a phone number to a partner and check it"]',
     '[{"question": "How do you say 21?", "options": ["Two-ten-one", "Twenty-one", "Twenty and one", "Twelve-nine"], "correctIndex": 1}, {"question": "\"How much does it cost?\" asks about...", "options": ["Time", "Price", "Distance", "Age"], "correctIndex": 1}]',
     'beginner', 2)
) AS v(slug, title, description, explanation, objectives, examples, exercises, quizzes, level, sort_order)
     ON c.slug = 'english-for-beginners'
WHERE NOT EXISTS (
    SELECT 1 FROM lessons l WHERE l.node_id = c.id AND l.slug = v.slug
)
  AND EXISTS (SELECT 1 FROM admin_users);

-- ─── 6. Curated videos — one approved primary per seeded lesson ─────────────
-- Every youtube_video_id below was verified against the YouTube oEmbed API;
-- title/channel are the values it returned. source='curated' (never 'auto') so
-- the review queue and the curation workflow treat them like admin picks.
INSERT INTO lesson_videos
    (lesson_id, youtube_video_id, title, channel, is_primary, curator_status, source,
     date_reviewed, notes, added_by)
SELECT l.id, v.video_id, v.title, v.channel, true, 'approved', 'curated',
       current_date, 'Seeded by scripts/seed_content.sql', a.id
FROM (VALUES
    ('html-first-page',        'UB1O30fR-EE', 'HTML Crash Course For Absolute Beginners', 'Traversy Media'),
    ('css-styling-page',       'yfoY53QXEnI', 'CSS Crash Course For Absolute Beginners', 'Traversy Media'),
    ('js-interactive-page',    'hdI2bqOjy3c', 'JavaScript Crash Course For Beginners', 'Traversy Media'),
    ('what-is-a-rest-api',     '-mN3VyJuCjM', 'What Is REST API? Examples And How To Use It: Crash Course System Design', 'ByteByteGo'),
    ('designing-clean-endpoints', '7nm1pYuKAhY', 'Deep Dive into REST API Design and Implementation Best Practices', 'Software Developer Diaries'),
    ('building-api-with-node', 'TlB_eWDSMt4', 'Node.js Tutorial for Beginners: Learn Node in 1 Hour', 'Programming with Mosh'),
    ('money-basics',           'UcAY6qRHlw0', 'These Are The Steps To Manage Your Money | Personal Finance Basics', 'The Wealth Workshop'),
    ('financial-literacy',     'ouvbeb2wSGA', 'Financial Literacy In 63 Minutes', 'Tina Huang'),
    ('budgeting-50-30-20',     'eNtWq0NJPO4', 'How to Budget Money: The 50/30/20 Rule', 'My Finance Empire'),
    ('greetings-introductions','vwA2XTUEDoQ', 'Lesson 1 | Greetings | English Level: Beginner | CEFR - A1', 'UK English With Emma'),
    ('listening-greetings',    '8PWUVMsUg_U', 'A1-A2 Daily English Listening | Greetings & Introductions', 'LinguaListen'),
    ('numbers-and-counting',   'YuXFxvTbviI', '1 - 100 Learn Basic English Numbers + Pronunciation Practice', 'Shaw English Online')
) AS v(lesson_slug, video_id, title, channel)
JOIN lessons l ON l.slug = v.lesson_slug
CROSS JOIN LATERAL (
    SELECT a.id FROM admin_users a ORDER BY a.created_at LIMIT 1
) a
WHERE NOT EXISTS (
    SELECT 1 FROM lesson_videos existing
    WHERE existing.lesson_id = l.id AND existing.youtube_video_id = v.video_id
);

COMMIT;

-- ─── Summary (psql prints these) ─────────────────────────────────────────────
\echo 'Seed result:'
SELECT n.node_type,
       count(*)                                                    AS total,
       count(*) FILTER (WHERE n.phase = 1)                          AS phase1,
       count(*) FILTER (WHERE n.phase = 2)                          AS phase2
FROM taxonomy_nodes n
GROUP BY n.node_type
ORDER BY n.node_type;

SELECT count(*) AS lessons,
       count(*) FILTER (WHERE status = 'published')                 AS published,
       (SELECT count(*) FROM lesson_videos WHERE source='curated')  AS curated_videos
FROM lessons;
