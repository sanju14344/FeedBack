# Student Feedback Analyzer System

A college-oriented system for anonymous student feedback and sentiment-based analysis for Class Representatives (CR).

## Setup Instructions

### 1. Supabase Configuration
1. Create a new project on [Supabase](https://supabase.com/).
2. Run the SQL from `schema.sql` in the Supabase SQL Editor to set up the tables.
3. Enable **Google Auth**:
   - Go to Authentication -> Providers -> Google.
   - Follow the instructions to set up Google OAuth.
4. Enable **Email/Password Auth**:
   - Go to Authentication -> Providers -> Email.
5. Get your project URL and Anon Key from Project Settings -> API.

### 2. Backend Setup
1. Open a terminal in the `feedback` directory.
2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables:
   - Copy `.env.example` to `.env`.
   - Fill in your `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and a random `FLASK_SECRET_KEY`.
5. Run the server:
   ```bash
   python main.py
   ```

### 3. Frontend Setup
1. Open `static/js/app.js`.
2. Update the `SUPABASE_URL` and `SUPABASE_ANON_KEY` constants at the top of the file with your project details.
3. Open `http://127.0.0.1:5000` in your browser.

## Features
- **Student Dashboard**: Anonymous feedback submission using Google Login.
- **CR Dashboard**: Sentiment analysis reports, subject/staff management, and feedback moderation.
- **Sentiment Analysis**: Keyword-based classification into Positive, Neutral, and Negative.
- **Visualizations**: Interactive charts using Chart.js.

## Ethics & Privacy
- Student identity is hidden by default in CR views.
- No personal data is stored beyond basic Google profile for misuse control.
