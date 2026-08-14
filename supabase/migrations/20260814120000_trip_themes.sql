alter table public.trips
  add column if not exists theme text;

update public.trips
set theme = 'classic'
where theme is null or theme not in ('classic', 'bieszczady');

alter table public.trips
  alter column theme set default 'classic',
  alter column theme set not null;

alter table public.trips
  drop constraint if exists trips_theme_check;

alter table public.trips
  add constraint trips_theme_check
  check (theme in ('classic', 'bieszczady'));

comment on column public.trips.theme is
  'Klucz wspólnego motywu interfejsu wyjazdu.';
