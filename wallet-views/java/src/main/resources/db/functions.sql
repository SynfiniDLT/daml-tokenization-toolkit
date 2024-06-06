-- Sorty an ARRAY of text values
CREATE OR REPLACE FUNCTION
  sort_array(text_array text[])
RETURNS text[] LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS
$$
  SELECT
    array_agg(x)
  FROM (SELECT unnest(text_array) AS x order by x) AS _;
$$ ;

-- Return the values of a Daml Set of Text elements as an array. Given a jsonb input:
--
-- {
--   "map": [["value1", {}], ["value2", {}]]
-- }
--
-- It will return a sorted PSQL ARRAY of values: ["value1", "value2"]
CREATE OR REPLACE FUNCTION
  daml_set_text_values(body jsonb)
RETURNS text[] LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS
$$
  SELECT sort_array(
    ARRAY(SELECT jsonb_array_elements_text(jsonb_path_query_array( body, 'strict $.map[*][0]')))
  ) ;
$$ ;

-- Function to flatten a collection of observer parties (from the Daml Finance Disclosure interface). Given a jsonb
-- input:
--
-- [
--   [
--     "context1",
--     {"map": [["party1", {}]]}
--   ],
--   [
--     "context2",
--     {"map": [["party2", {}], ["party3", {}]]}
--   ]
-- ]
--
-- It will return a sorted PSQL ARRAY of parties: ["party1", "party2", "party3"]
CREATE OR REPLACE FUNCTION
  flatten_observers(body jsonb)
RETURNS text[] LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS
$$
  SELECT sort_array(
    ARRAY(SELECT jsonb_array_elements_text(jsonb_path_query_array( body, 'strict $[*][1].map[*][0]')))
  ) ;
$$ ;
