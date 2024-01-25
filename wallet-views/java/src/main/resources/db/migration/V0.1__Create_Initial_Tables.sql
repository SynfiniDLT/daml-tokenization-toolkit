-- Hstore (key/value) data type must be enabled
CREATE EXTENSION hstore;

CREATE TABLE account_open_offers
(
  cid VARCHAR NOT NULL,
  custodian VARCHAR NOT NULL,
  owner_incoming_controlled BOOLEAN NOT NULL,
  owner_outgoing_controlled BOOLEAN NOT NULL,
  additional_controllers_incoming VARCHAR[] NOT NULL,
  additional_controllers_outgoing VARCHAR[] NOT NULL,
  permitted_owners VARCHAR[],
  account_factory_cid VARCHAR NOT NULL,
  holding_factory_cid VARCHAR NOT NULL,
  description VARCHAR NOT NULL,
  create_offset VARCHAR,
  create_effective_time TIMESTAMP,
  archive_offset VARCHAR,
  archive_effective_time TIMESTAMP,
  PRIMARY KEY (cid)
);

CREATE TABLE account_open_offer_witnesses
(
  cid VARCHAR NOT NULL,
  party VARCHAR NOT NULL,
  PRIMARY KEY (cid, party)
);

CREATE TABLE accounts
(
  cid VARCHAR NOT NULL,
  custodian VARCHAR NOT NULL,
  owner VARCHAR NOT NULL,
  account_id VARCHAR NOT NULL,
  description VARCHAR NOT NULL,
  holding_factory_cid VARCHAR NOT NULL,
  controllers_incoming VARCHAR[] NOT NULL,
  controllers_outgoing VARCHAR[] NOT NULL,
  create_offset VARCHAR,
  create_effective_time TIMESTAMP,
  archive_offset VARCHAR,
  archive_effective_time TIMESTAMP,
  PRIMARY KEY (cid)
);

CREATE INDEX accounts_key_index ON accounts (custodian, owner, account_id);

CREATE TABLE account_factory_events
(
  account_cid VARCHAR UNIQUE,
  account_custodian VARCHAR NOT NULL,
  account_owner VARCHAR NOT NULL,
  account_id VARCHAR NOT NULL,
  is_create BOOLEAN NOT NULL
);

CREATE INDEX account_factory_events_key_index ON account_factory_events (account_custodian, account_owner, account_id);

CREATE TYPE lock_type AS ENUM ('semaphore', 'reentrant');

CREATE TABLE holdings
(
  cid VARCHAR NOT NULL,
  account_custodian VARCHAR NOT NULL,
  account_owner VARCHAR NOT NULL,
  account_id VARCHAR NOT NULL,
  instrument_depository VARCHAR NOT NULL,
  instrument_id VARCHAR NOT NULL,
  instrument_issuer VARCHAR NOT NULL,
  instrument_version VARCHAR NOT NULL,
  amount NUMERIC NOT NULL,
  lockers VARCHAR[] NOT NULL,
  lock_context VARCHAR[] NOT NULL,
  lock_type lock_type,
  create_offset VARCHAR,
  create_effective_time TIMESTAMP,
  archive_offset VARCHAR,
  archive_effective_time TIMESTAMP,
  PRIMARY KEY (cid)
);

CREATE INDEX holdings_account_key_index ON holdings (account_id, account_custodian, account_owner);
CREATE INDEX holdings_instrument_key_index ON holdings
  (instrument_depository, instrument_id, instrument_issuer, instrument_version);
CREATE INDEX holdings_create_offset_index ON holdings (create_offset);
CREATE INDEX holdings_archive_offset_index ON holdings (archive_offset);

CREATE TABLE holding_witnesses
(
  cid VARCHAR NOT NULL,
  party VARCHAR NOT NULL,
  PRIMARY KEY (cid, party)
);

CREATE TABLE batches
(
  batch_id VARCHAR NOT NULL,
  requestors_hash INTEGER NOT NULL,
  requestors VARCHAR[] NOT NULL,
  cid VARCHAR NOT NULL,
  description VARCHAR NOT NULL,
  context_id VARCHAR,
  create_offset VARCHAR,
  create_effective_time TIMESTAMP,
  archive_offset VARCHAR,
  archive_effective_time TIMESTAMP,
  PRIMARY KEY (cid)
);

CREATE INDEX batches_key_index ON batches (batch_id, requestors_hash);
CREATE INDEX batches_create_offset_index ON batches (create_offset);

CREATE TABLE batch_witnesses
(
  cid VARCHAR NOT NULL,
  party VARCHAR NOT NULL,
  PRIMARY KEY (cid, party)
);

CREATE TABLE instructions
(
  batch_id VARCHAR NOT NULL,
  instruction_id VARCHAR NOT NULL,
  requestors_hash INTEGER NOT NULL,
  requestors VARCHAR[] NOT NULL,
  cid VARCHAR UNIQUE,
  sender VARCHAR NOT NULL,
  receiver VARCHAR NOT NULL,
  custodian VARCHAR NOT NULL,
  amount NUMERIC NOT NULL,
  instrument_depository VARCHAR NOT NULL,
  instrument_issuer VARCHAR NOT NULL,
  instrument_id VARCHAR NOT NULL,
  instrument_version VARCHAR NOT NULL,
  allocation_pledge_cid VARCHAR,
  allocation_credit_receiver BOOLEAN NOT NULL,
  allocation_pass_through_from VARCHAR,
  allocation_pass_through_from_account_id VARCHAR,
  allocation_settle_off_ledger BOOLEAN NOT NULL,
  approval_account_id VARCHAR,
  approval_pass_through_to VARCHAR,
  approval_debit_sender BOOLEAN NOT NULL,
  approval_settle_off_ledger BOOLEAN NOT NULL,
  create_offset VARCHAR,
  create_effective_time TIMESTAMP,
  archive_offset VARCHAR,
  archive_effective_time TIMESTAMP
);

CREATE INDEX instructions_key_index on instructions (batch_id, requestors_hash);
CREATE INDEX instructions_create_offset_index on instructions (create_offset);

CREATE TABLE instruction_witnesses
(
  cid VARCHAR NOT NULL,
  party VARCHAR NOT NULL,
  PRIMARY KEY (cid, party)
);

CREATE TABLE instruction_executions
(
  instruction_cid VARCHAR NOT NULL,
  PRIMARY KEY (instruction_cid)
);

CREATE TABLE token_instruments
(
  instrument_depository VARCHAR NOT NULL,
  instrument_issuer VARCHAR NOT NULL,
  instrument_id VARCHAR NOT NULL,
  instrument_version VARCHAR NOT NULL,
  cid VARCHAR NOT NULL UNIQUE,
  description VARCHAR NOT NULL,
  valid_as_of TIMESTAMP NOT NULL,
  create_offset VARCHAR,
  create_effective_time TIMESTAMP,
  archive_offset VARCHAR,
  archive_effective_time TIMESTAMP
);

CREATE INDEX token_instruments_key_index ON token_instruments
  (instrument_depository, instrument_id, instrument_issuer, instrument_version);

CREATE TABLE pba_instruments
(
  instrument_depository VARCHAR NOT NULL,
  instrument_issuer VARCHAR NOT NULL,
  instrument_id VARCHAR NOT NULL,
  instrument_version VARCHAR NOT NULL,
  cid VARCHAR NOT NULL UNIQUE,
  description VARCHAR NOT NULL,
  valid_as_of TIMESTAMP NOT NULL,
  owner VARCHAR NOT NULL,
  attributes HSTORE NOT NULL,
  create_offset VARCHAR,
  create_effective_time TIMESTAMP,
  archive_offset VARCHAR,
  archive_effective_time TIMESTAMP
);

CREATE INDEX pba_instruments_key_index ON pba_instruments
  (instrument_depository, instrument_id, instrument_issuer, instrument_version);

CREATE TABLE instrument_witnesses
(
  cid VARCHAR NOT NULL,
  party VARCHAR NOT NULL,
  PRIMARY KEY (cid, party)
);

CREATE TABLE token_instrument_issuers
(
  cid VARCHAR NOT NULL,
  issuer VARCHAR NOT NULL,
  depository VARCHAR NOT NULL,
  instrument_factory_cid VARCHAR NOT NULL,
  create_offset VARCHAR,
  create_effective_time TIMESTAMP,
  archive_offset VARCHAR,
  archive_effective_time TIMESTAMP,
  PRIMARY KEY (cid)
);

CREATE INDEX token_instrument_issuers_issuer_index ON token_instrument_issuers (issuer);
CREATE INDEX token_instrument_issuers_depository_index ON token_instrument_issuers (depository);

CREATE TABLE token_instrument_issuer_witnesses
(
  cid VARCHAR NOT NULL,
  party VARCHAR NOT NULL,
  PRIMARY KEY (cid, party)
);
