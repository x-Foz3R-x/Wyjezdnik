-- Waluty są osobnymi księgami: kwoty w EUR nie są automatycznie przeliczane
-- na PLN. Każdy wydatek zachowuje walutę wybraną przy jego utworzeniu.
begin;

alter table public.trips
add column if not exists default_currency text;

update public.trips
set default_currency = 'PLN'
where default_currency is null;

alter table public.trips
alter column default_currency set default 'PLN',
alter column default_currency set not null;

alter table public.trips
drop constraint if exists trips_default_currency_check;

alter table public.trips
add constraint trips_default_currency_check
check (default_currency in ('PLN', 'EUR', 'USD', 'GBP', 'CHF', 'CZK', 'HUF'));

alter table public.expenses
add column if not exists currency text;

update public.expenses
set currency = 'PLN'
where currency is null;

alter table public.expenses
alter column currency set default 'PLN',
alter column currency set not null;

alter table public.expenses
drop constraint if exists expenses_currency_check;

alter table public.expenses
add constraint expenses_currency_check
check (currency in ('PLN', 'EUR', 'USD', 'GBP', 'CHF', 'CZK', 'HUF'));

create index if not exists expenses_trip_currency_created_idx
  on public.expenses(trip_id, currency, created_at desc)
  where deleted_at is null;

alter table public.users
add column if not exists revolut_url text,
add column if not exists payment_note text;

comment on column public.trips.default_currency is
  'Waluta podpowiadana przy dodawaniu wydatku. Istniejące wpisy zachowują własną walutę.';
comment on column public.expenses.currency is
  'Kod ISO waluty wpisu. Rozliczenia różnych walut są prowadzone osobno.';
comment on column public.users.revolut_url is
  'Opcjonalny link lub identyfikator Revolut podany samodzielnie przez uczestnika.';
comment on column public.users.payment_note is
  'Opcjonalna informacja o preferowanym sposobie zwrotu pieniędzy.';

drop function if exists public.create_expense_entry(
  uuid, uuid, uuid, numeric, text, uuid[], jsonb
);

create function public.create_expense_entry(
  p_trip_id uuid,
  p_payer_id uuid,
  p_created_by uuid,
  p_amount numeric,
  p_description text,
  p_split_among uuid[],
  p_currency text,
  p_shares jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_expense_id uuid;
  v_finance_mode text;
  v_share record;
  v_share_sum numeric := 0;
begin
  if p_amount <= 0 or p_amount > 1000000 then
    raise exception 'invalid expense amount';
  end if;

  if char_length(btrim(p_description)) not between 1 and 240 then
    raise exception 'invalid expense description';
  end if;

  if cardinality(p_split_among) < 2 or not (p_payer_id = any(p_split_among)) then
    raise exception 'invalid expense participants';
  end if;

  if p_currency not in ('PLN', 'EUR', 'USD', 'GBP', 'CHF', 'CZK', 'HUF') then
    raise exception 'invalid expense currency';
  end if;

  select trip.finance_mode
  into v_finance_mode
  from public.trips trip
  where trip.id = p_trip_id
    and trip.status = 'active';

  if not found then
    raise exception 'trip is closed or missing';
  end if;

  if not exists (
    select 1 from public.users participant
    where participant.id = p_payer_id and participant.trip_id = p_trip_id
  ) or not exists (
    select 1 from public.users participant
    where participant.id = p_created_by and participant.trip_id = p_trip_id
  ) then
    raise exception 'payer or author does not belong to trip';
  end if;

  if exists (
    select 1
    from unnest(p_split_among) participant_id
    left join public.users participant
      on participant.id = participant_id and participant.trip_id = p_trip_id
    where participant.id is null
  ) then
    raise exception 'expense participant does not belong to trip';
  end if;

  if jsonb_typeof(p_shares) <> 'array' then
    raise exception 'expense shares must be an array';
  end if;

  for v_share in
    select share.user_id, share.amount
    from jsonb_to_recordset(p_shares) as share(user_id uuid, amount numeric)
  loop
    if v_share.user_id = p_payer_id
      or not (v_share.user_id = any(p_split_among))
      or v_share.amount <= 0
      or (v_finance_mode = 'whole' and v_share.amount <> trunc(v_share.amount))
    then
      raise exception 'invalid expense share';
    end if;

    v_share_sum := v_share_sum + v_share.amount;
  end loop;

  if v_share_sum > p_amount then
    raise exception 'expense shares exceed total amount';
  end if;

  insert into public.expenses (
    trip_id,
    user_id,
    created_by,
    amount,
    description,
    split_among,
    currency,
    entry_type
  )
  values (
    p_trip_id,
    p_payer_id,
    p_created_by,
    p_amount,
    btrim(p_description),
    p_split_among,
    p_currency,
    'expense'
  )
  returning id into v_expense_id;

  insert into public.expense_shares (expense_id, user_id, amount)
  select v_expense_id, share.user_id, share.amount
  from jsonb_to_recordset(p_shares) as share(user_id uuid, amount numeric);

  return v_expense_id;
end;
$$;

revoke all on function public.create_expense_entry(
  uuid, uuid, uuid, numeric, text, uuid[], text, jsonb
) from public, anon, authenticated;
grant execute on function public.create_expense_entry(
  uuid, uuid, uuid, numeric, text, uuid[], text, jsonb
) to service_role;

drop function if exists public.update_expense_entry(
  uuid, uuid, uuid, uuid, numeric, text, uuid[], jsonb
);

create function public.update_expense_entry(
  p_trip_id uuid,
  p_expense_id uuid,
  p_changed_by uuid,
  p_payer_id uuid,
  p_amount numeric,
  p_description text,
  p_split_among uuid[],
  p_currency text,
  p_shares jsonb default '[]'::jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_expense public.expenses%rowtype;
  v_finance_mode text;
  v_previous_shares jsonb;
  v_share record;
  v_share_sum numeric := 0;
begin
  if not exists (
    select 1
    from public.users participant
    where participant.id = p_changed_by
      and participant.trip_id = p_trip_id
      and participant.is_admin = true
  ) then
    raise exception 'trip manager required';
  end if;

  select expense.*
  into v_expense
  from public.expenses expense
  where expense.id = p_expense_id
    and expense.trip_id = p_trip_id
    and expense.deleted_at is null
  for update;

  if not found or v_expense.entry_type <> 'expense' then
    raise exception 'editable expense not found';
  end if;

  select trip.finance_mode
  into v_finance_mode
  from public.trips trip
  where trip.id = p_trip_id
    and trip.status = 'active';

  if not found then
    raise exception 'trip is closed or missing';
  end if;

  if p_amount <= 0 or p_amount > 1000000
    or char_length(btrim(p_description)) not between 1 and 240
    or cardinality(p_split_among) < 2
    or not (p_payer_id = any(p_split_among))
  then
    raise exception 'invalid expense';
  end if;

  if p_currency not in ('PLN', 'EUR', 'USD', 'GBP', 'CHF', 'CZK', 'HUF') then
    raise exception 'invalid expense currency';
  end if;

  if not exists (
    select 1 from public.users participant
    where participant.id = p_payer_id and participant.trip_id = p_trip_id
  ) or exists (
    select 1
    from unnest(p_split_among) participant_id
    left join public.users participant
      on participant.id = participant_id and participant.trip_id = p_trip_id
    where participant.id is null
  ) then
    raise exception 'expense participant does not belong to trip';
  end if;

  if jsonb_typeof(p_shares) <> 'array' then
    raise exception 'expense shares must be an array';
  end if;

  for v_share in
    select share.user_id, share.amount
    from jsonb_to_recordset(p_shares) as share(user_id uuid, amount numeric)
  loop
    if v_share.user_id = p_payer_id
      or not (v_share.user_id = any(p_split_among))
      or v_share.amount <= 0
      or (v_finance_mode = 'whole' and v_share.amount <> trunc(v_share.amount))
    then
      raise exception 'invalid expense share';
    end if;
    v_share_sum := v_share_sum + v_share.amount;
  end loop;

  if v_share_sum > p_amount then
    raise exception 'expense shares exceed total amount';
  end if;

  select coalesce(
    jsonb_agg(jsonb_build_object('user_id', share.user_id, 'amount', share.amount)),
    '[]'::jsonb
  )
  into v_previous_shares
  from public.expense_shares share
  where share.expense_id = p_expense_id;

  insert into public.expense_revisions (
    expense_id,
    trip_id,
    changed_by,
    action,
    previous_data
  )
  values (
    p_expense_id,
    p_trip_id,
    p_changed_by,
    'updated',
    to_jsonb(v_expense) || jsonb_build_object('shares', v_previous_shares)
  );

  update public.expenses
  set user_id = p_payer_id,
      amount = p_amount,
      description = btrim(p_description),
      split_among = p_split_among,
      currency = p_currency,
      updated_at = now()
  where id = p_expense_id;

  delete from public.expense_shares
  where expense_id = p_expense_id;

  insert into public.expense_shares (expense_id, user_id, amount)
  select p_expense_id, share.user_id, share.amount
  from jsonb_to_recordset(p_shares) as share(user_id uuid, amount numeric);
end;
$$;

revoke all on function public.update_expense_entry(
  uuid, uuid, uuid, uuid, numeric, text, uuid[], text, jsonb
) from public, anon, authenticated;
grant execute on function public.update_expense_entry(
  uuid, uuid, uuid, uuid, numeric, text, uuid[], text, jsonb
) to service_role;

commit;
