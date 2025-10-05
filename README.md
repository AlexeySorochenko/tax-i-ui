# Tax Intake – Frontend (Vite + React)
A clean, Uber-inspired minimal interface in English. Connects to your existing FastAPI backend.

## Run
npm install
npm run dev
# open http://localhost:5173

## Configure backend URL
By default the app calls http://localhost:8000. For Render or another host:
VITE_API_BASE=https://your-backend.onrender.com npm run dev
# or for prod build
VITE_API_BASE=https://your-backend.onrender.com npm run build && npm run preview

## Pages
- Sign in / Register (accountant)
- Drivers (list & create)
- Driver Detail
  - Upload document (auto OCR + extraction)
  - Period status (ensure, advance stage)
  - Documents list with quality issues & extracted fields
  - Export CSV
