-- V11: Add Languages category with English and Spanish courses/lessons
-- This migration adds the Languages taxonomy that was missing from V10,
-- ensuring language learners don't see programming content.

-- Languages category
INSERT INTO taxonomy_nodes (id, parent_id, node_type, name, slug, description, icon, phase, is_active, sort_order, depth, created_at, updated_at)
VALUES
    ('b0000000-0000-0000-0000-000000000004', NULL, 'category', 'Languages', 'languages', 'Learn new languages from beginner to advanced', '🌍', 1, true, 3, 0, now(), now())
ON CONFLICT (slug) DO NOTHING;

-- Subcategories under Languages
INSERT INTO taxonomy_nodes (id, parent_id, node_type, name, slug, description, phase, is_active, sort_order, depth, created_at, updated_at)
VALUES
    ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004', 'subcategory', 'English', 'english', 'Master English from beginner to advanced', 1, true, 0, 1, now(), now()),
    ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000004', 'subcategory', 'Spanish', 'spanish', 'Learn conversational Spanish from scratch', 1, true, 1, 1, now(), now())
ON CONFLICT (slug) DO NOTHING;

-- Courses under English
INSERT INTO taxonomy_nodes (id, parent_id, node_type, name, slug, description, phase, is_active, sort_order, depth, created_at, updated_at)
VALUES
    ('d0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000004', 'course', 'English for Beginners', 'english-for-beginners', 'Start speaking English with confidence from day one', 1, true, 0, 2, now(), now()),
    ('d0000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000004', 'course', 'English Intermediate Conversations', 'english-intermediate-conversations', 'Upgrade your English for professional settings', 1, true, 1, 2, now(), now()),
    ('d0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000004', 'course', 'Advanced English and Idioms', 'advanced-english-idioms', 'Master idioms, formal writing, and speak like a native', 1, true, 2, 2, now(), now())
ON CONFLICT (slug) DO NOTHING;

-- Courses under Spanish
INSERT INTO taxonomy_nodes (id, parent_id, node_type, name, slug, description, phase, is_active, sort_order, depth, created_at, updated_at)
VALUES
    ('d0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000005', 'course', 'Spanish from Zero', 'spanish-from-zero', 'Learn conversational Spanish with clear, structured lessons', 1, true, 0, 2, now(), now())
ON CONFLICT (slug) DO NOTHING;

-- Lessons for English for Beginners
INSERT INTO lessons (id, node_id, title, slug, description, explanation, objectives, examples, exercises, quizzes, level, status, sort_order, created_by, created_at, updated_at)
VALUES
    ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000008', 'Greetings and introductions', 'greetings-and-introductions',
     'Learn essential English greetings and how to introduce yourself in everyday situations.',
     'Greetings are the foundation of any conversation in English. Mastering them helps you make a good first impression and build connections with native speakers. This lesson covers formal and informal greetings, responses, and follow-up questions that keep conversations flowing naturally.',
     '["Use common English greetings in appropriate contexts", "Introduce yourself and ask basic personal questions", "Understand formal vs informal register", "Respond naturally to greetings"]',
     '["Hello, my name is Sarah. Nice to meet you!", "Good morning! How are you doing today?", "Hi, I''m from Uganda. What about you?"]',
     '["Practice greeting a friend vs a stranger", "Role-play introducing yourself at a networking event", "Write a short self-introduction paragraph"]',
     '[{"question": "Which greeting is most appropriate for a formal business meeting?", "options": ["Hey, what''s up?", "Good morning, it''s a pleasure to meet you.", "Yo!", "Sup?"], "correctIndex": 1}, {"question": "How do you respond to \"How are you?\" in a casual setting?", "options": ["I am fine, thank you.", "Pretty good, thanks! How about you?", "My name is John.", "I live in London."], "correctIndex": 1}]',
     'beginner', 'published', 0, 'a0000000-0000-0000-0000-000000000001', now(), now()),
    ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000008', 'Numbers, dates, and time', 'numbers-dates-time',
     'Master English numbers, dates, days of the week, and telling time.',
     'Numbers, dates, and time are essential for everyday communication. Whether you''re shopping, making appointments, or planning your day, these concepts come up constantly. This lesson covers cardinal and ordinal numbers, days of the week, months, and how to ask and tell time in English.',
     '["Count from 0 to 1000 in English", "Say dates and days of the week correctly", "Ask and tell time using 12-hour and 24-hour formats", "Understand common time expressions like \"in the morning\" or \"at noon\""]',
     '["It''s half past three in the afternoon.", "Today is Monday, the fifteenth of September.", "I have a meeting at two o''clock."]',
     '["Write out today''s date in words", "Practice telling time from a clock face", "Schedule a pretend appointment using English dates and times"]',
     '[{"question": "How do you say \"3:30\" in English?", "options": ["Three thirty", "Half past three", "Three and a half", "Both A and B are correct"], "correctIndex": 3}]',
     'beginner', 'published', 1, 'a0000000-0000-0000-0000-000000000001', now(), now()),
    ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000008', 'Shopping and everyday situations', 'shopping-everyday',
     'Navigate shopping scenarios, restaurants, and daily interactions in English.',
     'Real-world English happens outside the classroom. This lesson prepares you for everyday situations like shopping at a store, ordering food at a restaurant, asking for directions, and making small talk. These practical phrases will boost your confidence in English-speaking environments.',
     '["Ask for prices, sizes, and colors when shopping", "Order food and drinks at a restaurant", "Ask for and understand basic directions", "Handle common situations like returning an item or asking for help"]',
     '["Excuse me, how much does this cost?", "Could I have the menu, please?", "Where is the nearest bus stop?", "I''d like to return this shirt, please."]',
     '["Practice a shopping dialogue with a partner", "Role-play ordering a meal at a restaurant", "Write directions from your home to a nearby shop"]',
     '[{"question": "Which phrase is polite when asking for help in a store?", "options": ["Give me this.", "Hey, where is this?", "Excuse me, could you help me find something?", "I want this now."], "correctIndex": 2}]',
     'beginner', 'published', 2, 'a0000000-0000-0000-0000-000000000001', now(), now())
ON CONFLICT (node_id, slug) DO NOTHING;

-- Lessons for English Intermediate
INSERT INTO lessons (id, node_id, title, slug, description, explanation, objectives, examples, exercises, quizzes, level, status, sort_order, created_by, created_at, updated_at)
VALUES
    ('e0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000009', 'Making arguments and opinions', 'making-arguments-opinions',
     'Express your opinions clearly and construct persuasive arguments in English.',
     'At the intermediate level, expressing opinions and making arguments is crucial for professional and academic success. This lesson covers opinion phrases, agreement and disagreement structures, hedging language, and how to present evidence to support your views.',
     '["Express opinions using phrases like \"I believe\", \"In my view\", \"From my perspective\"", "Agree and disagree politely in discussions", "Use hedging language to soften strong statements", "Structure a simple argument with claim, evidence, and reasoning"]',
     '["I believe that remote work improves productivity.", "I see your point, but I think there are other factors to consider.", "It could be argued that..."]',
     '["Write a paragraph expressing your opinion on a current topic", "Practice a structured debate with a partner", "Identify hedging language in news articles"]',
     '[{"question": "Which phrase is used to politely disagree?", "options": ["You are wrong.", "I see your point, but...", "That is incorrect.", "No way."], "correctIndex": 1}]',
     'intermediate', 'published', 0, 'a0000000-0000-0000-0000-000000000001', now(), now()),
    ('e0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000009', 'Professional email writing', 'professional-email-writing',
     'Write clear, professional emails for business and academic contexts.',
     'Email is the backbone of professional communication. A well-written email can open doors, while a poorly crafted one can create misunderstandings. This lesson covers email structure, tone, subject lines, attachments, follow-ups, and common business email templates.',
     '["Write a clear subject line that summarizes the email purpose", "Use appropriate salutations and closings for different contexts", "Structure emails with purpose, context, and call-to-action", "Handle attachments and follow-up requests professionally"]',
     '["Subject: Meeting Request - Project Alpha Discussion", "Dear Ms. Johnson, I hope this email finds you well.", "Please find attached the quarterly report for your review."]',
     '["Write a follow-up email after a job interview", "Draft a meeting request to a colleague", "Compose an email declining a meeting politely"]',
     '[{"question": "What is the most important element of a professional email?", "options": ["Using exclamation marks", "A clear subject line", "Writing in all caps", "Using slang"], "correctIndex": 1}]',
     'intermediate', 'published', 1, 'a0000000-0000-0000-0000-000000000001', now(), now())
ON CONFLICT (node_id, slug) DO NOTHING;

-- Lessons for Advanced English
INSERT INTO lessons (id, node_id, title, slug, description, explanation, objectives, examples, exercises, quizzes, level, status, sort_order, created_by, created_at, updated_at)
VALUES
    ('e0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000010', 'Common idioms in context', 'common-idioms-context',
     'Understand and use everyday English idioms naturally in conversation.',
     'Idioms are expressions whose meaning isn''t obvious from the individual words. They add color, humor, and cultural depth to English. Mastering idioms makes your speech sound natural and helps you understand native speakers better. This lesson covers the most common idioms used in daily life, work, and social situations.',
     '["Recognize and understand 20+ common English idioms", "Use idioms appropriately in conversation and writing", "Identify the literal vs figurative meaning of idiomatic expressions", "Understand when NOT to use formal language vs idiomatic expressions"]',
     '["It''s raining cats and dogs. (raining heavily)", "Break a leg! (good luck)", "The ball is in your court. (it''s your turn to decide)", "I''m on the fence about it. (undecided)"]',
     '["Write a short story using at least 5 idioms from this lesson", "Watch a TV show scene and identify idioms used", "Practice explaining an idiom to someone who doesn''t know it"]',
     '[{"question": "What does \"break a leg\" mean in English?", "options": ["To actually break your leg", "To get injured", "Good luck", "To run very fast"], "correctIndex": 2}, {"question": "If someone says \"the ball is in your court\", they mean:", "options": ["You should play tennis", "It is your turn to make a decision", "You need to exercise", "The meeting is over"], "correctIndex": 1}]',
     'advanced', 'published', 0, 'a0000000-0000-0000-0000-000000000001', now(), now()),
    ('e0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000010', 'Academic and formal writing', 'academic-formal-writing',
     'Master the conventions of academic essays, reports, and formal documents.',
     'Academic and formal writing requires a different register than everyday English. This lesson covers essay structure, thesis statements, topic sentences, transitions, citation conventions, and the formal tone expected in professional and academic settings.',
     '["Write a well-structured academic essay with introduction, body, and conclusion", "Use formal vocabulary and avoid colloquialisms", "Develop a clear thesis statement and support it with evidence", "Apply proper citation and referencing conventions"]',
     '["This essay examines the impact of climate change on coastal communities.", "Furthermore, research suggests that...", "In conclusion, the evidence strongly indicates that..."]',
     '["Write a 500-word essay on a topic of your choice", "Rewrite informal sentences in formal register", "Create an outline for a research paper"]',
     '[{"question": "Which word is most appropriate for formal academic writing?", "options": ["A lot of", "Many", "Tons of", "Heaps of"], "correctIndex": 1}]',
     'advanced', 'published', 1, 'a0000000-0000-0000-0000-000000000001', now(), now())
ON CONFLICT (node_id, slug) DO NOTHING;

-- Lessons for Spanish from Zero
INSERT INTO lessons (id, node_id, title, slug, description, explanation, objectives, examples, exercises, quizzes, level, status, sort_order, created_by, created_at, updated_at)
VALUES
    ('e0000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000011', 'Basic greetings and phrases', 'basic-greetings-phrases',
     'Learn essential Spanish greetings and everyday phrases to start conversations.',
     'Spanish greetings are your gateway to communicating with over 500 million native speakers worldwide. This lesson covers the most common greetings, farewells, and polite expressions used in daily Spanish conversations. You''ll learn when to use formal vs informal register and practice real-world dialogues.',
     '["Greet someone formally and informally in Spanish", "Introduce yourself and ask basic personal questions", "Use common polite expressions like \"por favor\" and \"gracias\"", "Understand the difference between tú and usted forms"]',
     '["¡Hola! ¿Cómo estás? (Hi! How are you?)", "Buenos días, me llamo María. (Good morning, my name is María.)", "Mucho gusto, ¿cómo te llamas? (Nice to meet you, what''s your name?)"]',
     '["Practice greeting a friend vs an elder in Spanish", "Write a short self-introduction in Spanish", "Role-play ordering coffee at a café in Spanish"]',
     '[{"question": "Which greeting is informal in Spanish?", "options": ["Buenos días", "Hola", "Buenas tardes", "Mucho gusto"], "correctIndex": 1}, {"question": "How do you say \"My name is\" in Spanish?", "options": ["Yo soy", "Me llamo", "Tengo nombre", "Es mi nombre"], "correctIndex": 1}]',
     'beginner', 'published', 0, 'a0000000-0000-0000-0000-000000000001', now(), now()),
    ('e0000000-0000-0000-0000-000000000009', 'd0000000-0000-0000-0000-000000000011', 'Verbs: ser vs estar', 'verbs-ser-estar',
     'Master the fundamental difference between ser and estar in Spanish.',
     'One of the trickiest aspects for Spanish learners is understanding when to use ser vs estar. Both mean \"to be\" but serve different purposes. Ser describes permanent characteristics, identity, and origin. Estar describes temporary states, locations, and emotions. This lesson breaks down the rules with clear examples and practice exercises.',
     '["Explain the key differences between ser and estar", "Choose the correct verb for common descriptions", "Form sentences using ser for identity and origin", "Form sentences using estar for location and emotions"]',
     '["Yo soy de Uganda. (I am from Uganda.) — origin uses ser", "Ella está cansada. (She is tired.) — temporary state uses estar", "La fiesta es en mi casa. (The party is at my house.) — event location uses estar", "Mi hermano es tall. (My brother is tall.) — permanent trait uses ser"]',
     '["Complete 10 sentences choosing between ser and estar", "Write a paragraph describing yourself using both verbs", "Translate 5 English sentences to Spanish using ser or estar"]',
     '[{"question": "Which verb do you use to describe where you live?", "options": ["Ser", "Estar", "Tener", "Haber"], "correctIndex": 1}, {"question": "Which sentence correctly uses ser?", "options": ["Yo estoy contento.", "Yo soy estudiante.", "Yo estoy en la casa.", "Yo estoy cansado."], "correctIndex": 1}]',
     'beginner', 'published', 1, 'a0000000-0000-0000-0000-000000000001', now(), now())
ON CONFLICT (node_id, slug) DO NOTHING;
