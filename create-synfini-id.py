#!/usr/bin/env python3

import sys
import hashlib
import uuid
import json
import subprocess
import tempfile

def truncated_uuid():
  return f'{uuid.uuid4().int & ((1<<48) - 1):012x}'

def dops(command, input_json, *args):
  if type(input_json) is str:
    _dops(command, input_json, *args)
  else:
    with tempfile.NamedTemporaryFile(mode='w+') as tmp:
      print(tmp.name)
      json.dump(input_json, tmp)
      tmp.flush()
      _dops(command, tmp.name, *args)

def _dops(command, input_file, *args):
  res = subprocess.run(['dops', command, input_file] + list(args)).returncode
  if res != 0:
    raise Exception('Non-zero exit code')
  print('res = ', res)
  print('type(res) = ', type(res))

# Issuer arguments
issuer_party_label = sys.argv[1]
depository_party_label = sys.argv[2]
issuer_contract_label = sys.argv[3]
publisher_contract_label = sys.argv[4]
issuer_settlement_prefs_file = sys.argv[5]

# Other arguments
owner_party_label = sys.argv[6]
owner_settlement_prefs_file = sys.argv[7]
name = sys.argv[8]
observers = []
if len(sys.argv) > 9:
  observers = sys.argv[9:]

instrument = {
  'issuer': issuer_contract_label,
  'id': 'Synfini ID',
  'description': 'Identifier of Synfini ecosystem member',
  'validAsOf': '2023-10-03T23:15:48.569796Z',
  'observers': [
    {
      'context': 'setup',
      'parties': observers + [owner_party_label]
    }
  ],
  'metadata': {
    'publisher': publisher_contract_label,
    'attributes': [
      {
        'attributeName': 'Name',
        'attributeValue': name,
        'displayType': 'string'
      },
      {
        'attributeName': 'Issuance ID',
        'attributeValue': truncated_uuid(),
        'displayType': 'string'
      }
    ],
    'disclosureControllers': [owner_party_label, issuer_party_label, depository_party_label],
    'observers': [
      {
        'context': 'setup',
        'parties': observers
      }
    ]
  }
}

def hash_utf8(string):
  h = hashlib.sha256()
  h.update(string.encode('utf-8'))
  return h.digest()

def compute_instrument_version():
  hashes = []
  hashes.append(hash_utf8(instrument['description']))
  hashes.append(hash_utf8(instrument['validAsOf']))

  attribute_hashes = []

  for attribute in instrument['metadata']['attributes']:
    hAttr = hashlib.sha256()
    hAttr.update(hash_utf8(attribute['attributeName']))
    hAttr.update(hash_utf8(attribute['attributeValue']))
    hAttr.update(hash_utf8(attribute['displayType']))

    attribute_hashes.append(hAttr.digest())

  attribute_hashes.sort()
  hash_all_attributes = hashlib.sha256()
  for h in attribute_hashes:
    hash_all_attributes.update(h)
  hashes.append(hash_all_attributes.digest())

  version_hash = hashlib.sha256()
  for h in hashes:
    version_hash.update(h)

  return version_hash.hexdigest()

instrument['version'] = compute_instrument_version()[-12:]

create_instrument_json = {
  'readAs': ['SynfiniPublic'],
  'instrumentSettings': [instrument]
}

print(json.dumps(create_instrument_json, indent=2))
dops('create-instruments', create_instrument_json)

# TODO: this should be implemented as a one-time offer, not an open offer
offer_id = truncated_uuid()
settlement_offer = {
  'readAs': ['SynfiniPublic'],
  'settlementOpenOfferSettings': [
    {
      'offerId': offer_id,
      'offerers': [issuer_party_label],
      'offerDescription': 'Receive Synfini ID token',
      'settlementInstructors': [{'party': issuer_party_label}, {'taker': {}}],
      'settlers': [{'party': issuer_party_label}],
      'steps': [
        {
          'sender': {'party': 'SynfiniValidator'},
          'receiver': {'taker': {}},
          'instrumentDepository': depository_party_label,
          'instrumentIssuer': issuer_party_label,
          'instrumentId': instrument['id'],
          'instrumentVersion': instrument['version'],
          'amount': 1
        }
      ],
      'minQuantity': 1,
      'maxQuantity': 1,
      'settlementOpenOfferFactory': 'V1',
      'routeProvider': 'validatorCustodianV1',
      'settlementFactory': 'V1',
      'observers' : [{
        'context': 'setup',
        'parties': [owner_party_label]
      }]
    }
  ]
}

dops('create-settlement-open-offers', settlement_offer)

take_settlement_offer = {
  'readAs': ['SynfiniPublic'],
  'takeOpenOfferSettings': {
    'offerId': offer_id,
    'offerers': [issuer_party_label],
    'taker': owner_party_label,
    'description': 'Onboard to Synfini',
    'quantity': 1
  }
}

batch_id = str(uuid.uuid4())
dops('take-settlement-open-offer', take_settlement_offer, batch_id)
dops('accept-settlement', issuer_settlement_prefs_file, f'{issuer_party_label},{owner_party_label}', batch_id)
dops('accept-settlement', owner_settlement_prefs_file, f'{issuer_party_label},{owner_party_label}', batch_id)
dops(
  'execute-settlement',
  {
    'readAs': ['SynfiniPublic'],
    'settleSettings': {
      'settler': issuer_party_label
    }
  },
  f'{issuer_party_label},{owner_party_label}',
  batch_id
)
