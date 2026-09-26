-- Initial Schema for Physics Assessment Hub

CREATE TYPE user_role AS ENUM ('TEACHER', 'STUDENT');
CREATE TYPE assessment_type AS ENUM ('HOMEWORK', 'QUIZ', 'MONTHLY_TEST', 'SEMESTER_EXAM');
CREATE TYPE assessment_status AS ENUM ('DRAFT', 'SCHEDULED', 'OPEN', 'PAUSED', 'CLOSED', 'PUBLISHED');
CREATE TYPE question_type AS ENUM ('MCQ', 'MULTI_SELECT', 'TRUE_FALSE', 'SHORT_ANSWER', 'NUMERICAL', 'FILL_BLANK', 'MATCHING', 'LONG_ANSWER', 'PHYSICS_CALCULATION', 'IMAGE_BASED', 'FILE_UPLOAD');
CREATE TYPE session_status AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'GRADED');

-- Profiles (extends auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    role user_role NOT NULL,
    full_name TEXT NOT NULL,
    student_id_number TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Classes
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    grade TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Class Enrollments
CREATE TABLE class_enrollments (
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (student_id, class_id)
);

-- Assessments
CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    instructions TEXT,
    subject TEXT DEFAULT 'Physics',
    grade TEXT NOT NULL,
    quarter TEXT NOT NULL,
    type assessment_type NOT NULL,
    status assessment_status DEFAULT 'DRAFT',
    time_limit_minutes INTEGER,
    shuffle_questions BOOLEAN DEFAULT FALSE,
    shuffle_options BOOLEAN DEFAULT FALSE,
    passing_score NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assessment Availability
CREATE TABLE assessment_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    open_time TIMESTAMPTZ,
    close_time TIMESTAMPTZ,
    UNIQUE(assessment_id, class_id)
);

-- Questions
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    type question_type NOT NULL,
    content TEXT NOT NULL, -- Includes LaTeX
    points NUMERIC NOT NULL DEFAULT 1,
    order_index INTEGER NOT NULL,
    is_required BOOLEAN DEFAULT TRUE,
    options JSONB, -- For MCQ, etc. [{id, text}]
    correct_answer JSONB, -- The correct answer reference or text
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student Sessions (Attempts)
CREATE TABLE student_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    deadline TIMESTAMPTZ,
    status session_status DEFAULT 'IN_PROGRESS',
    randomized_question_order JSONB, -- [question_id_1, question_id_2...]
    total_score NUMERIC,
    max_score NUMERIC,
    teacher_feedback TEXT,
    UNIQUE(student_id, assessment_id)
);

-- Student Answers
CREATE TABLE student_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES student_sessions(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    answer_data JSONB, -- The student's answer (text, selected option ids, etc)
    file_urls JSONB, -- For file uploads
    score NUMERIC,
    feedback TEXT,
    UNIQUE(session_id, question_id)
);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_answers ENABLE ROW LEVEL SECURITY;

-- Basic Policies (Simplified for demo purposes. In production, these should be more rigorous)

-- Profiles: Anyone can read profiles. Users can update their own.
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Classes: Teachers can CRUD their own. Students can read classes they are in.
CREATE POLICY "Classes viewable by teacher or enrolled students" ON classes FOR SELECT USING (
    auth.uid() = teacher_id OR 
    EXISTS (SELECT 1 FROM class_enrollments WHERE class_enrollments.class_id = classes.id AND class_enrollments.student_id = auth.uid())
);
CREATE POLICY "Teachers can insert classes" ON classes FOR INSERT WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Teachers can update classes" ON classes FOR UPDATE USING (auth.uid() = teacher_id);
CREATE POLICY "Teachers can delete classes" ON classes FOR DELETE USING (auth.uid() = teacher_id);

-- Assessments: Teachers can CRUD their own. Students can read if status is not DRAFT and they are assigned.
CREATE POLICY "Assessments viewable by teacher or assigned students" ON assessments FOR SELECT USING (
    auth.uid() = teacher_id OR 
    (status != 'DRAFT' AND EXISTS (
        SELECT 1 FROM assessment_availability aa
        JOIN class_enrollments ce ON aa.class_id = ce.class_id
        WHERE aa.assessment_id = assessments.id AND ce.student_id = auth.uid()
    ))
);
CREATE POLICY "Teachers can modify their assessments" ON assessments FOR ALL USING (auth.uid() = teacher_id);

-- Assessment Availability
CREATE POLICY "Availability viewable by teacher or assigned students" ON assessment_availability FOR SELECT USING (
    EXISTS (SELECT 1 FROM assessments WHERE assessments.id = assessment_id AND assessments.teacher_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM class_enrollments ce WHERE ce.class_id = assessment_availability.class_id AND ce.student_id = auth.uid())
);
CREATE POLICY "Teachers modify availability" ON assessment_availability FOR ALL USING (
    EXISTS (SELECT 1 FROM assessments WHERE assessments.id = assessment_id AND assessments.teacher_id = auth.uid())
);

-- Questions: Viewable if assessment is viewable.
CREATE POLICY "Questions viewable if assessment viewable" ON questions FOR SELECT USING (
    EXISTS (SELECT 1 FROM assessments WHERE assessments.id = assessment_id AND (
        assessments.teacher_id = auth.uid() OR 
        (assessments.status != 'DRAFT' AND EXISTS (
            SELECT 1 FROM assessment_availability aa
            JOIN class_enrollments ce ON aa.class_id = ce.class_id
            WHERE aa.assessment_id = assessments.id AND ce.student_id = auth.uid()
        ))
    ))
);
CREATE POLICY "Teachers modify questions" ON questions FOR ALL USING (
    EXISTS (SELECT 1 FROM assessments WHERE assessments.id = assessment_id AND assessments.teacher_id = auth.uid())
);

-- Sessions: Teachers can read all for their assessments. Students read/write their own.
CREATE POLICY "Sessions viewable by student or teacher" ON student_sessions FOR SELECT USING (
    auth.uid() = student_id OR
    EXISTS (SELECT 1 FROM assessments WHERE assessments.id = assessment_id AND assessments.teacher_id = auth.uid())
);
CREATE POLICY "Students create own sessions" ON student_sessions FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students update own sessions" ON student_sessions FOR UPDATE USING (auth.uid() = student_id);
CREATE POLICY "Teachers update sessions" ON student_sessions FOR UPDATE USING (
    EXISTS (SELECT 1 FROM assessments WHERE assessments.id = assessment_id AND assessments.teacher_id = auth.uid())
);

-- Answers: Same as sessions
CREATE POLICY "Answers viewable by student or teacher" ON student_answers FOR SELECT USING (
    EXISTS (SELECT 1 FROM student_sessions WHERE student_sessions.id = session_id AND (
        student_sessions.student_id = auth.uid() OR
        EXISTS (SELECT 1 FROM assessments WHERE assessments.id = student_sessions.assessment_id AND assessments.teacher_id = auth.uid())
    ))
);
CREATE POLICY "Students insert/update own answers" ON student_answers FOR ALL USING (
    EXISTS (SELECT 1 FROM student_sessions WHERE student_sessions.id = session_id AND student_sessions.student_id = auth.uid())
);
CREATE POLICY "Teachers update answers (grading)" ON student_answers FOR UPDATE USING (
    EXISTS (SELECT 1 FROM student_sessions 
            JOIN assessments ON student_sessions.assessment_id = assessments.id 
            WHERE student_sessions.id = session_id AND assessments.teacher_id = auth.uid())
);

