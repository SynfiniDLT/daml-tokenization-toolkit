-- Return the values of a Daml set as an array
CREATE OR REPLACE FUNCTION
  text_set_values(body jsonb)
RETURNS text[] LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE STRICT AS '
BEGIN
  SELECT ARRAY(SELECT jsonb_array_elements_text(jsonb_path_query_array( body, strict ''$.map[*][0]''))) ;
END; ' ;
