#!/usr/bin/env python3

import sys
import hashlib
import uuid
import json
import subprocess
import tempfile

def dops(command, input_json, *args):
  with tempfile.NamedTemporaryFile(mode='w+') as tmp:
    print(tmp.name)
    json.dump(input_json, tmp)
    tmp.flush()
    subprocess.run(['dops', command, tmp.name] + list(args))

issuer_party_label = sys.argv[1]
depository_party_label = sys.argv[2]
issuer_contract_label = sys.argv[3]
publisher_contract_label = sys.argv[4]
owner_party_label = sys.argv[5]
name = sys.argv[6]
observers = sys.argv[7:]

observers_with_context = [
  {
    'context': 'setup',
    'parties': observers + [owner_party_label]
  }
]

instrument = {
  'issuer': issuer_contract_label,
  'id': 'SynfiniID',
  'description': 'Identifier of Synfini ecosystem member',
  'validAsOf': '2023-10-03T23:15:48.569796Z',
  'observers': observers_with_context,
  'metadata': {
    'publisher': publisher_contract_label,
    'attributes': [
      {
        'attributeName': 'Party name',
        'attributeValue': name,
        'displayType': 'string'
      },
      {
        'attributeName': 'ID value',
        'attributeValue': str(uuid.uuid4()),
        'displayType': 'string'
      }
    ],
    'disclosureControllers': [owner_party_label, issuer_party_label, depository_party_label],
    'observers': observers_with_context
  }
}

def hash_utf8(string):
  h = hashlib.sha256()
  h.update(string.encode('utf-8'))
  return h.digest()

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

instrument['version'] = version_hash.hexdigest()

create_instrument_json = {
  'readAs': ['SynfiniPublic'],
  'instrumentSettings': [instrument]
}

print(json.dumps(create_instrument_json, indent=2))
dops('create-instruments', create_instrument_json)

# TODO: this should be implemented as a one-time offer, not an open offer
offer_id = str(uuid.uuid4())
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
