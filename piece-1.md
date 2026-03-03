Piece 01 — Firebase Setup + Auth
Est: 45 min | Tonight
What to build

Connect Firebase (Auth + Firestore) to kennel
/login page with email + password
Protected routes: unauthenticated → redirect to /login
Create two users in Firebase console: receptionist@shomer.app, vet@shomer.app
After login → /dashboard (blank page for now)

Firestore collections to create manually

clinics/{clinicId}/doctors/
petOwners/
queue/
visits/

Test Cases
TC-01-01 Login with valid creds → redirected to /dashboard
TC-01-02 Wrong password → error shown, no redirect
TC-01-03 Incognito + go to /dashboard → redirected to /login
TC-01-04 Login → refresh → still on /dashboard
TC-01-05 Logout → redirected to /login, back-nav also redirects
