-- Seed Test Data Script for StudySync / CoStudy
-- Password for all test users: password123 (BCrypt: $2a$10$EblZqNptyYvcLm/VwDCVAu.zF0bJkE150v.m3/Kj6/vNfW6i7n4/O)

-- 1. SEED TEST USERS (5 Tutors + 5 Students)
INSERT INTO auth.app_user (user_id, username, email, password_hash, user_type, verified, full_name, program, year_of_study, tutor_display_name, created_at, updated_at)
VALUES 
  -- Tutors
  (gen_random_uuid(), 'adjoa', 'adjoa@costudy.edu', '$2a$10$EblZqNptyYvcLm/VwDCVAu.zF0bJkE150v.m3/Kj6/vNfW6i7n4/O', 'TUTOR', true, 'Adjoa Mensah', 'BSc Computer Science', 3, 'Adjoa Mensah (CS & Phys Tutor)', NOW(), NOW()),
  (gen_random_uuid(), 'kwame_dev', 'kwame@costudy.edu', '$2a$10$EblZqNptyYvcLm/VwDCVAu.zF0bJkE150v.m3/Kj6/vNfW6i7n4/O', 'TUTOR', true, 'Kwame Osei', 'BSc Software Engineering', 4, 'Kwame Osei (Algorithms Specialist)', NOW(), NOW()),
  (gen_random_uuid(), 'abena_phys', 'abena@costudy.edu', '$2a$10$EblZqNptyYvcLm/VwDCVAu.zF0bJkE150v.m3/Kj6/vNfW6i7n4/O', 'TUTOR', true, 'Abena Appiah', 'BSc Applied Physics', 3, 'Abena Appiah (Physics & Math Tutor)', NOW(), NOW()),
  (gen_random_uuid(), 'kofi_tutor', 'kofi@costudy.edu', '$2a$10$EblZqNptyYvcLm/VwDCVAu.zF0bJkE150v.m3/Kj6/vNfW6i7n4/O', 'TUTOR', true, 'Kofi Asante', 'BSc Electrical Engineering', 4, 'Kofi Asante (Circuits & Calculus)', NOW(), NOW()),
  (gen_random_uuid(), 'emmanuel_b', 'emmanuel@costudy.edu', '$2a$10$EblZqNptyYvcLm/VwDCVAu.zF0bJkE150v.m3/Kj6/vNfW6i7n4/O', 'TUTOR', true, 'Emmanuel Boateng', 'BSc Information Technology', 3, 'Emmanuel Boateng (Database Expert)', NOW(), NOW()),
  
  -- Students
  (gen_random_uuid(), 'samuel_k', 'samuel@costudy.edu', '$2a$10$EblZqNptyYvcLm/VwDCVAu.zF0bJkE150v.m3/Kj6/vNfW6i7n4/O', 'STUDENT', true, 'Samuel Kwarteng', 'BSc Computer Science', 2, NULL, NOW(), NOW()),
  (gen_random_uuid(), 'grace_a', 'grace@costudy.edu', '$2a$10$EblZqNptyYvcLm/VwDCVAu.zF0bJkE150v.m3/Kj6/vNfW6i7n4/O', 'STUDENT', true, 'Grace Addo', 'BSc Computer Engineering', 1, NULL, NOW(), NOW()),
  (gen_random_uuid(), 'patience_m', 'patience@costudy.edu', '$2a$10$EblZqNptyYvcLm/VwDCVAu.zF0bJkE150v.m3/Kj6/vNfW6i7n4/O', 'STUDENT', true, 'Patience Morrison', 'BSc Business Admin', 2, NULL, NOW(), NOW()),
  (gen_random_uuid(), 'yaw_tech', 'yaw@costudy.edu', '$2a$10$EblZqNptyYvcLm/VwDCVAu.zF0bJkE150v.m3/Kj6/vNfW6i7n4/O', 'STUDENT', true, 'Yaw Dankwa', 'BSc Information Technology', 1, NULL, NOW(), NOW()),
  (gen_random_uuid(), 'eunice_s', 'eunice@costudy.edu', '$2a$10$EblZqNptyYvcLm/VwDCVAu.zF0bJkE150v.m3/Kj6/vNfW6i7n4/O', 'STUDENT', true, 'Eunice Sarfo', 'BSc Mechanical Engineering', 2, NULL, NOW(), NOW())
ON CONFLICT (username) DO NOTHING;


-- 2. SEED APPROVED TUTOR APPLICATIONS
INSERT INTO tutoring.tutor_application (application_id, user_id, course_id, hourly_rate, status, attempts_used, is_registered_course, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'adjoa', 'CS101', 80.0, 'APPROVED', 1, true, NOW(), NOW()),
  (gen_random_uuid(), 'adjoa', 'PHY101', 80.0, 'APPROVED', 1, true, NOW(), NOW()),
  (gen_random_uuid(), 'kwame_dev', 'CS202', 100.0, 'APPROVED', 1, true, NOW(), NOW()),
  (gen_random_uuid(), 'kwame_dev', 'MATH101', 100.0, 'APPROVED', 1, true, NOW(), NOW()),
  (gen_random_uuid(), 'abena_phys', 'PHY101', 75.0, 'APPROVED', 1, true, NOW(), NOW()),
  (gen_random_uuid(), 'abena_phys', 'MATH201', 75.0, 'APPROVED', 1, true, NOW(), NOW()),
  (gen_random_uuid(), 'kofi_tutor', 'ENG101', 90.0, 'APPROVED', 1, true, NOW(), NOW()),
  (gen_random_uuid(), 'emmanuel_b', 'CS301', 85.0, 'APPROVED', 1, true, NOW(), NOW())
ON CONFLICT DO NOTHING;


-- 3. SEED BOOKINGS
INSERT INTO tutoring.booking (booking_id, student_id, tutor_id, course_id, hours, hourly_rate, gross_amount, platform_fee, tutor_earning, commission_pct, currency, status, payment_verified, payment_reference, created_at, updated_at)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'samuel_k', 'kwame_dev', 'CS202', 2.0, 100.0, 200.0, 30.0, 170.0, 15.0, 'GHS', 'COMPLETED', true, 'PAY-REF-001', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
  ('a2222222-2222-2222-2222-222222222222', 'grace_a', 'adjoa', 'CS101', 1.5, 80.0, 120.0, 18.0, 102.0, 15.0, 'GHS', 'COMPLETED', true, 'PAY-REF-002', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
  ('a3333333-3333-3333-3333-333333333333', 'eunice_s', 'kofi_tutor', 'ENG101', 2.0, 90.0, 180.0, 27.0, 153.0, 15.0, 'GHS', 'COMPLETED', true, 'PAY-REF-003', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
  ('a4444444-4444-4444-4444-444444444444', 'KelvinII', 'abena_phys', 'PHY101', 1.0, 75.0, 75.0, 11.25, 63.75, 15.0, 'GHS', 'CONFIRMED', true, 'PAY-REF-004', NOW(), NOW())
ON CONFLICT DO NOTHING;


-- 4. SEED REVIEWS
INSERT INTO tutoring.review (review_id, booking_id, student_id, tutor_id, course_id, rating, comment, created_at)
VALUES
  (gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', 'samuel_k', 'kwame_dev', 'CS202', 5, 'Kwame explained Data Structures pointers and trees so clearly! Passed my midterm with an A.', NOW() - INTERVAL '2 days'),
  (gen_random_uuid(), 'a2222222-2222-2222-2222-222222222222', 'grace_a', 'adjoa', 'CS101', 5, 'Adjoa is an amazing tutor for CS101. Super patient and helpful with Python loops and functions.', NOW() - INTERVAL '1 day'),
  (gen_random_uuid(), 'a3333333-3333-3333-3333-333333333333', 'eunice_s', 'kofi_tutor', 'ENG101', 4, 'Great session on circuit analysis. Solved all past examination questions together.', NOW() - INTERVAL '3 days')
ON CONFLICT DO NOTHING;


-- 5. SEED STUDY GROUPS & MEMBERS
INSERT INTO learning.study_group (group_id, group_name, course_id, description, created_by, created_at)
VALUES
  ('b1111111-1111-1111-1111-111111111111', 'CS101 Coding Squad', 'CS101', 'Group for studying Python fundamentals, logic loops, and assignment problem sets.', 'adjoa', NOW() - INTERVAL '7 days'),
  ('b2222222-2222-2222-2222-222222222222', 'Data Structures Masterclass', 'CS202', 'Deep dive into Binary Trees, HashTables, Sorting Algorithms, and Big-O notation.', 'kwame_dev', NOW() - INTERVAL '5 days'),
  ('b3333333-3333-3333-3333-333333333333', 'PHY101 Problem Solvers', 'PHY101', 'Solving physics mechanics, kinematics, and thermodynamics past questions.', 'abena_phys', NOW() - INTERVAL '6 days'),
  ('b4444444-4444-4444-4444-444444444444', 'Calculus & Linear Algebra Hub', 'MATH101', 'Math study group covering integration techniques, matrix multiplication, and vector spaces.', 'kofi_tutor', NOW() - INTERVAL '4 days'),
  ('b5555555-5555-5555-5555-555555555555', 'Database Systems & SQL Wizards', 'CS301', 'ER Diagrams, Relational Normalization (3NF), and SQL queries practice.', 'emmanuel_b', NOW() - INTERVAL '3 days')
ON CONFLICT DO NOTHING;

INSERT INTO learning.group_member (group_member_id, group_id, user_id, joined_at)
VALUES
  (gen_random_uuid(), 'b1111111-1111-1111-1111-111111111111', 'adjoa', NOW() - INTERVAL '7 days'),
  (gen_random_uuid(), 'b1111111-1111-1111-1111-111111111111', 'samuel_k', NOW() - INTERVAL '6 days'),
  (gen_random_uuid(), 'b1111111-1111-1111-1111-111111111111', 'grace_a', NOW() - INTERVAL '5 days'),
  (gen_random_uuid(), 'b1111111-1111-1111-1111-111111111111', 'KelvinII', NOW() - INTERVAL '4 days'),
  
  (gen_random_uuid(), 'b2222222-2222-2222-2222-222222222222', 'kwame_dev', NOW() - INTERVAL '5 days'),
  (gen_random_uuid(), 'b2222222-2222-2222-2222-222222222222', 'samuel_k', NOW() - INTERVAL '4 days'),
  (gen_random_uuid(), 'b2222222-2222-2222-2222-222222222222', 'emmanuel_b', NOW() - INTERVAL '3 days'),
  
  (gen_random_uuid(), 'b3333333-3333-3333-3333-333333333333', 'abena_phys', NOW() - INTERVAL '6 days'),
  (gen_random_uuid(), 'b3333333-3333-3333-3333-333333333333', 'grace_a', NOW() - INTERVAL '5 days'),
  (gen_random_uuid(), 'b3333333-3333-3333-3333-333333333333', 'eunice_s', NOW() - INTERVAL '4 days')
ON CONFLICT DO NOTHING;


-- 6. SEED GROUP CHAT MESSAGES
INSERT INTO learning.chat_message (message_id, group_id, sender_id, sender_name, body, sent_at)
VALUES
  (gen_random_uuid(), 'b1111111-1111-1111-1111-111111111111', 'adjoa', 'Adjoa Mensah', 'Welcome everyone to CS101 Coding Squad! Feel free to drop any questions on recursion or list comprehensions here.', NOW() - INTERVAL '2 hours'),
  (gen_random_uuid(), 'b1111111-1111-1111-1111-111111111111', 'samuel_k', 'Samuel Kwarteng', 'Thanks Adjoa! Excited for our weekend study session.', NOW() - INTERVAL '1 hour'),
  (gen_random_uuid(), 'b2222222-2222-2222-2222-222222222222', 'kwame_dev', 'Kwame Osei', 'Hey team, I uploaded the summary notes for Binary Search Trees in the group files.', NOW() - INTERVAL '3 hours')
ON CONFLICT DO NOTHING;


-- 7. SEED STUDY TASKS & STUDY SESSIONS (FOR ANALYTICS & FOCUS TIMER)
INSERT INTO learning.study_task (task_id, user_id, title, subject, is_completed, deadline, created_at)
VALUES
  (gen_random_uuid(), 'samuel_k', 'Complete CS202 Assignment 3 on Graph Traversal', 'CS202', false, NOW() + INTERVAL '2 days', NOW()),
  (gen_random_uuid(), 'samuel_k', 'Review PHY101 Chapter 4 Kinematics Notes', 'PHY101', true, NOW() - INTERVAL '1 day', NOW() - INTERVAL '3 days'),
  (gen_random_uuid(), 'grace_a', 'Practice 10 Python recursion problems', 'CS101', true, NOW() - INTERVAL '2 days', NOW() - INTERVAL '4 days')
ON CONFLICT DO NOTHING;

INSERT INTO learning.study_session (session_id, user_id, duration_minutes, subject, session_date)
VALUES
  (gen_random_uuid(), 'samuel_k', 45, 'CS202', NOW() - INTERVAL '1 day'),
  (gen_random_uuid(), 'samuel_k', 60, 'CS202', NOW() - INTERVAL '2 days'),
  (gen_random_uuid(), 'samuel_k', 30, 'PHY101', NOW() - INTERVAL '3 days'),
  (gen_random_uuid(), 'grace_a', 50, 'CS101', NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

