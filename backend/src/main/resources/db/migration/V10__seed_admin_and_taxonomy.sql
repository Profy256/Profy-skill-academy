-- V9: Seed default admin user + taxonomy
-- Default admin: profy256@gmail.com / KAFEErO@256

INSERT INTO admin_users (id, email, password_hash, name, role, created_at, updated_at)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'profy256@gmail.com',
    '$2b$10$7KvmGoI2CuMbC.y4lTV67uIKrdXwRSd6xUM8GdWFbpUec6ZPpuvxe',
    'Super Admin',
    'admin',
    now(),
    now()
) ON CONFLICT (email) DO NOTHING;

-- Seed top-level categories
INSERT INTO taxonomy_nodes (id, parent_id, node_type, name, slug, description, phase, is_active, sort_order, depth, created_at, updated_at)
VALUES
    ('b0000000-0000-0000-0000-000000000001', NULL, 'category', 'Programming', 'programming', 'Learn to code from scratch to advanced', 1, true, 0, 0, now(), now()),
    ('b0000000-0000-0000-0000-000000000002', NULL, 'category', 'Data Science', 'data-science', 'Data analysis, ML, and AI', 1, true, 1, 0, now(), now()),
    ('b0000000-0000-0000-0000-000000000003', NULL, 'category', 'Business', 'business', 'Business skills and entrepreneurship', 1, true, 2, 0, now(), now())
ON CONFLICT (slug) DO NOTHING;

-- Subcategories under Programming
INSERT INTO taxonomy_nodes (id, parent_id, node_type, name, slug, description, phase, is_active, sort_order, depth, created_at, updated_at)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'subcategory', 'Web Development', 'web-development', 'HTML, CSS, JavaScript, React, and more', 1, true, 0, 1, now(), now()),
    ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'subcategory', 'Mobile Development', 'mobile-development', 'Android, iOS, Flutter, React Native', 1, true, 1, 1, now(), now()),
    ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'subcategory', 'Backend Development', 'backend-development', 'APIs, databases, server-side programming', 1, true, 2, 1, now(), now())
ON CONFLICT (slug) DO NOTHING;

-- Courses under Web Development
INSERT INTO taxonomy_nodes (id, parent_id, node_type, name, slug, description, phase, is_active, sort_order, depth, created_at, updated_at)
VALUES
    ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'course', 'HTML Fundamentals', 'html-fundamentals', 'Learn the building blocks of the web', 1, true, 0, 2, now(), now()),
    ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'course', 'CSS Mastery', 'css-mastery', 'Style beautiful responsive websites', 1, true, 1, 2, now(), now()),
    ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'course', 'JavaScript Essentials', 'javascript-essentials', 'Master modern JavaScript', 1, true, 2, 2, now(), now()),
    ('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'course', 'React Foundations', 'react-foundations', 'Build interactive UIs with React', 1, true, 3, 2, now(), now())
ON CONFLICT (slug) DO NOTHING;

-- Courses under Mobile Development
INSERT INTO taxonomy_nodes (id, parent_id, node_type, name, slug, description, phase, is_active, sort_order, depth, created_at, updated_at)
VALUES
    ('d0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000002', 'course', 'Flutter Basics', 'flutter-basics', 'Cross-platform mobile apps with Flutter', 1, true, 0, 2, now(), now())
ON CONFLICT (slug) DO NOTHING;

-- Courses under Backend Development
INSERT INTO taxonomy_nodes (id, parent_id, node_type, name, slug, description, phase, is_active, sort_order, depth, created_at, updated_at)
VALUES
    ('d0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000003', 'course', 'Node.js Fundamentals', 'nodejs-fundamentals', 'Server-side JavaScript with Node.js', 1, true, 0, 2, now(), now()),
    ('d0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000003', 'course', 'REST API Design', 'rest-api-design', 'Build clean RESTful APIs', 1, true, 1, 2, now(), now())
ON CONFLICT (slug) DO NOTHING;
