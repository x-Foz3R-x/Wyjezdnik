alter table public.trips
  add column if not exists expense_visibility text not null default 'everyone',
  add column if not exists expense_viewer_ids uuid[] not null default '{}'::uuid[];

alter table public.trips
  drop constraint if exists trips_expense_visibility_check;

alter table public.trips
  add constraint trips_expense_visibility_check
  check (expense_visibility in ('everyone', 'managers', 'selected'));

comment on column public.trips.expense_visibility is
  'Who may browse expenses unrelated to them. Managers always retain access.';

comment on column public.trips.expense_viewer_ids is
  'Additional participant ids allowed to browse all expenses when visibility is selected.';
