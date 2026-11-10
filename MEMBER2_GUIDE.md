# Finda Member 2: foundation and test guide

## What is included

This is an **early prototype**, not a finished backend or launch-ready product. The repository originally contained only a README. This contribution adds:

- A no-dependency Node.js demo with sample search, a few slang aliases, area filtering, freshness labels, simulated confirmations and simulated three-distinct-buyer reports.
- A starting Supabase/PostgreSQL schema with PostGIS, private contact storage and read-only row-level security (RLS) policies.
- Automated tests of the demo's core rules.

**Important:** The demo and Supabase schema are separate; the demo does not connect to Supabase. Its shops are fictional, data lives in memory and resets on restart. Messages are displayed on screen, not sent. Demo buyer IDs are arbitrary and must never be used for real anti-fraud. The demo has no authentication, phone reveal, real typo matching, daily scheduling, offline sync, photo compression, production moderation or real provider integration. Distance support is tested in the engine, but the demo page does not ask for location. Search is simple substring matching plus three exact aliases, not a complete search engine. The three-report demo marks the listing out of stock; it is not the final moderation policy.

## Test on your computer

1. Install Node.js 20 or newer from https://nodejs.org/ and Git from https://git-scm.com/.
2. In a terminal inside the project folder, run:

```bash
npm test
npm start
```

3. Visit http://localhost:3000. Search `gen` and `indomine`; try filtering by market. Click **Confirm**, then click **Seller: Yes** or **Seller: No** and inspect the simulated messages. Try reporting listing `1` using three different buyer IDs, then search `gen` again. Stop the server with Ctrl+C. Restarting clears all changes.
4. For a real phone, connect it to the same trusted Wi-Fi and open `http://YOUR_COMPUTER_LAN_IP:3000`, allowing the port through your firewall if needed. This unauthenticated demo should only run on a trusted network; do not expose it to the public internet or enter personal information.

## Supabase foundation (separate from the demo)

1. Create a new Supabase project for testing. Enable the PostGIS extension if it is not already enabled (Database → Extensions).
2. In the Supabase SQL Editor, paste and run the contents of `supabase/migrations/202611090001_foundation.sql` once. It targets a fresh project; review before using with an existing database. PostGIS must be installed in the `extensions` schema as on standard Supabase projects; if installed elsewhere, adjust the qualified types and indexes first.
3. Inspect the tables in the Table Editor. RLS is enabled on all the new tables. Public users can read market areas, products, aliases, shops and listings confirmed within 14 days; authenticated users can also read their own profile, requests and reports. Contact details are in a separate table with no client access. Client writes are intentionally disabled, **including seller writes**, until validated server-side functions and tests are added. Public shop records include owner UUID and approximate pin; review privacy and publication needs before production. Treat all sample data as fictional.
4. The SQL migration has not been run against a live Supabase project in this environment. Test migrations and RLS using separate anonymous, buyer, seller and admin accounts before launch. Never put a service-role key in frontend code or GitHub. Configure phone authentication and an SMS provider in Supabase separately; no OTP has been wired up here.

## Next implementation milestones

1. Agree API contracts with Members 1 and 3, and implement authenticated, ownership-checked seller create/update functions and buyer-only request/report functions. Add rate limits, abuse controls and authorization tests. Ensure verified/status fields cannot be self-assigned.
2. Integrate the frontend with Supabase; implement real PostGIS search with radius, typo matching, aliases and ranking; add boundary checks using real market polygons supplied by Member 3.
3. Build a server-side message queue, opt-in/consent, WhatsApp Cloud API templates and delivery-status handling, and Termii SMS fallback. Avoid duplicate sends; use timeouts, idempotency, retries and delivery logs. No real delivery occurs until provider accounts are configured.
4. Schedule daily reminders and freshness transitions, secure one-tap links, 30-minute request expiry and three-distinct-verified-buyer moderation. Implement photo compression, offline queues, metrics, backup/restore tests and account deletion. Review privacy and NDPA compliance with the team.
5. Test all paths on a phone and slow network. Never claim SMS, security, deletion, backups or compliance are complete until independently verified.

## Push your work to GitHub

Download and extract the project ZIP. In a terminal, clone your team repository with `git clone https://github.com/hakintun/Finda.git`, then copy the extracted files into the cloned `Finda` folder (allow the README to be replaced). Open a terminal in that cloned folder and run:

```bash
git status
git switch -c member-2-foundation
git add README.md .gitignore package.json demo supabase MEMBER2_GUIDE.md
git commit -m "Add Member 2 backend prototype and Supabase foundation"
git push -u origin member-2-foundation
```

If Git asks for your identity, first run `git config --global user.name "Your Name"` and `git config --global user.email "you@example.com"`. GitHub may ask you to authenticate with the GitHub CLI, a browser, or a personal access token; GitHub does not accept an account password for HTTPS Git pushes. You need write access to `hakintun/Finda`; otherwise fork the repository, change `origin` to your fork's URL, and push there. Open the GitHub link printed after the push and create a pull request into `main`; ask your teammates to review it. Never commit credentials or `.env` files. If a branch of that name already exists, choose another name.
