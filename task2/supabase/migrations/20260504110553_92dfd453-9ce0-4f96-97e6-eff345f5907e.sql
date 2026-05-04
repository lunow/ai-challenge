alter function public.handle_new_user() set search_path = public;
alter function public.generate_ticket_code() set search_path = public;
revoke execute on function public.generate_ticket_code() from public, anon;
revoke execute on function public.is_host_member(uuid, uuid, text) from public, anon;
revoke execute on function public.is_event_team(uuid, uuid) from public, anon;
grant execute on function public.is_host_member(uuid, uuid, text) to authenticated;
grant execute on function public.is_event_team(uuid, uuid) to authenticated;
grant execute on function public.generate_ticket_code() to authenticated;