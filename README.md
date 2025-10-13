# KIBBY

/app
 ├─ /creator
 │   ├─ page.tsx                 → form to create a new meeting
 │   ├─ /[id]
 │   │   └─ page.tsx             → creator view of a specific meeting (shows bookings)
 │   └─ /dashboard/page.tsx      → shows all meetings created by wallet
 ├─ /meet
 │   ├─ /[id]
 │   │   └─ page.tsx             → public meeting form for users to book
 └─ layout.tsx, page.tsx, etc.