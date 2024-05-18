-- utility functions copied from user guide
-- create or replace function latest_checkpoint()
-- returns table ("offset" __transactions."offset"%type, ix __transactions.ix%type) as $$
--   select max(groups."offset") as "offset", max(groups."ix") as ix
--   from (SELECT ix - ROW_NUMBER() OVER (ORDER BY ix) as delta, * FROM __transactions) groups
--   group by groups.delta
--   order by groups.delta
--   limit 1;

-- $$ language sql;
-- create or replace function first_checkpoint()
-- returns table ("offset" __transactions."offset"%type, ix __transactions.ix%type) as $$
--   select t."offset" as "offset", t."ix" as ix from __transactions t order by ix limit 1;
-- $$ language sql;

-- Return the values of a Daml Set of Text elements as an array
CREATE OR REPLACE FUNCTION
  daml_set_text_values(body jsonb)
RETURNS text[] LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS
$$
  SELECT ARRAY(SELECT jsonb_array_elements_text(jsonb_path_query_array( body, 'strict $.map[*][0]'))) ;
$$ ;

-- Function to flatten a collection of observer parties (from the Daml Finance Disclosure interface). Given an input:
--
-- [
--   [
--     "c1",
--     {"map": [["p1", {}]]}
--   ],
--   [
--     "c2",
--     {"map": [["p2", {}], ["p3", {}]]}
--   ]
-- ]
--
-- It will return an array of parties: ["p1", "p2", "p3"]
CREATE OR REPLACE FUNCTION
  flatten_observers(body jsonb)
RETURNS text[] LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS
$$
  SELECT ARRAY(SELECT jsonb_array_elements_text(jsonb_path_query_array( body, 'strict $[*][1].map[*][0]'))) ;
$$ ;
