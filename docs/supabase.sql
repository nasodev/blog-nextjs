-- grant create on schema public to anon

create or replace function increment(slug_text text) returns void AS $$
begin
  -- 먼저 업데이트를 시도
  update views 
  set count = count + 1 
  where slug = slug_text;
  
  -- 업데이트된 행이 없다면 새로 삽입
  if not found then
    insert into views(slug, count) 
    values (slug_text, 1);
  end if;
end;
$$ language plpgsql;

-- anon 계정 권한 부여 select, update, insert 
