
  # AI Enhanced Learning App

  This is a code bundle for AI Enhanced Learning App. The original project is available at https://www.figma.com/design/3mGRSnNFFpfHRmzmp8sdHT/AI-Enhanced-Learning-App.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## User guidance (MVP)

  The frontend now includes a first-use guidance system for teacher workflows:

  - First-login guided tour on teacher dashboard (`teacher.dashboard.v1`) with 5 steps:
    - Sidebar
    - Settings (default grade/subject + Digital Twin intro)
    - Class management
    - Task design
    - Course design
  - One-time first-click hints for key actions:
    - Start course generation
    - Create course
    - Add existing class from school
    - Create new class
    - Create new accounts
    - Search existing accounts
  - Guide state persisted in `localStorage` (`guideSeen_v1_${userId}`)
  - Guide/hint tracking events:
    - `guide_shown`
    - `guide_step_next`
    - `guide_skipped`
    - `guide_completed`
    - `hint_shown`
    - `hint_confirmed`
  