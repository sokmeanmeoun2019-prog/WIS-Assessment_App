# Physics Assessment Hub

A complete, fully functional, full-stack web application designed for a Physics teacher at WIS Phnom Penh, Cambodia, to manage homework, quizzes, monthly tests, and semester examinations.

## Overview
This application uses:
- **Next.js 14** (App Router) for the full-stack React framework.
- **Tailwind CSS** for modern, responsive styling.
- **Supabase** for PostgreSQL database, authentication, and secure row-level security.
- **KaTeX / react-katex** for rendering beautiful math equations and formulas.
- **Lucide React** for beautiful iconography.

## Features
- **Teacher Dashboard:** Create assessments, track student progress, grade submissions, and view class analytics.
- **Student Portal:** Take timed quizzes, view upcoming homework, and see published results.
- **Math Editor:** A visual equation editor with LaTeX support for both creating questions and answering physics problems.
- **Secure Taking Environment:** Countdown timers, file uploads for handwritten worksheets, and multi-step math input.
- **Robust Security:** Row Level Security (RLS) ensures students only see their own assigned assessments, and prevents premature viewing of results.

## Setup Instructions

### 1. Prerequisites
Ensure you have Node.js (v18+) and npm installed on your system.
You will also need a Supabase account (free tier is fine).

### 2. Installation
Open your terminal in the project directory and run:

```bash
npm install
```

### 3. Database Setup (Supabase)
1. Go to [Supabase](https://supabase.com) and create a new project.
2. Go to the SQL Editor in your Supabase dashboard.
3. Open `supabase/migrations/0001_initial.sql` from this project and paste its contents into the SQL Editor, then click "Run". This will create all the necessary tables, types, and RLS policies.
4. (Optional but recommended) In the Supabase SQL editor, create some mock profiles to test:
   ```sql
   -- Create a mock teacher
   INSERT INTO profiles (id, role, full_name) VALUES ('<some-uuid-from-auth-users>', 'TEACHER', 'Mr. Physics');
   ```

### 4. Environment Variables
Copy the `.env.example` file to a new file named `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your Supabase URL and Anon Key found in your Supabase Project Settings -> API.

### 5. Running the Application
Start the Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Testing Workflows
- Go to `/login?role=teacher` to view the teacher dashboard.
- Go to `/login?role=student` to view the student dashboard.
- (If Supabase is not configured, the login page has a demo bypass that allows you to click "Sign In" to see the UI directly without hitting the database).
- Try creating a new assessment, using the Math Editor (e.g. typing `$F=ma$`).
- Navigate to the student portal and try taking the demo assessment.

## Project Structure
- `/src/app/page.tsx` - Landing Page
- `/src/app/login/page.tsx` - Auth Page
- `/src/app/dashboard/...` - Teacher Portal Pages
- `/src/app/student/...` - Student Portal Pages
- `/src/components/MathEditor.tsx` - Reusable LaTeX-enabled rich text editor
- `/supabase/migrations/0001_initial.sql` - Database schema and security policies
