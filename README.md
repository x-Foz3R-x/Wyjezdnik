# 🏕️ Wyjezdnik

Modularna aplikacja do zarządzania wyjazdami ze znajomymi. Zaprojektowana tak, aby dostosowywać się do charakteru wyjazdu poprzez włączanie i wyłączanie konkretnych modułów (Finanse, Punkty, Harmonogram).

## 🚀 Technologie

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) + [Framer Motion](https://www.framer.com/motion/)
- **Baza Danych:** [Supabase](https://supabase.com/)
- **Bootstrap:** [Create T3 App](https://create.t3.gg/) (bez tRPC i ORM)

## 🛠️ Uruchomienie lokalne

1. Zainstaluj zależności:

   ```bash
   npm install
   ```

2. Ustaw zmienne środowiskowe:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SECRET_KEY=
   SESSION_SECRET=
   ```

   `SESSION_SECRET` powinien mieć co najmniej 32 znaki.

3. Uruchom aplikację:

   ```bash
   npm run dev
   ```

## Wdrożenie

Projekt używa Node.js 22. Przed wdrożeniem uruchom:

```bash
npm ci
npm run check
npm run build
npm audit --omit=dev
```

Migracje Supabase trzeba zastosować przed wdrożeniem odpowiadającej im wersji aplikacji. Dla
aktualnych zmian są to, w tej kolejności:

1. `supabase/migrations/20260729180000_currencies_payment_profiles_and_fair_rounding.sql`
2. `supabase/migrations/20260731203000_expense_history_visibility.sql`

PWA wymaga produkcyjnego adresu HTTPS. Po wdrożeniu testowym sprawdź:

1. instalację w Chrome lub Edge na Androidzie;
2. dodanie do ekranu początkowego z menu Udostępnij w Safari na iPhonie;
3. ponowne uruchomienie aplikacji z ikony;
4. ekran offline oraz minigrę po wyłączeniu sieci.
